// backend/routes/reservationRouter.js
import express from "express";
import {
  createReservation,
  getReservationById,
  getReservations,
  updateReservation,
  deleteReservation
} from "../dataAccess/ReservationDA.js";
import { addPendingPoints } from "../dataAccess/RewardPointDA.js";

const reservationRouter = express.Router();

// ⚠️ IMPORTANT: This route is for ADMIN CRUD operations ONLY!
// Clients should use POST /api/booking/complete for creating bookings
// That endpoint properly creates Reservation + RoomReservation + Invoice + Payment

// Calculate points based on number of nights (10 points per night)
function calculateRewardPoints(checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  return Math.max(10, nights * 10); // Minimum 10 points
}

/* CREATE - ADMIN ONLY: Simple reservation creation without invoice/payment */
reservationRouter.post("/", async (req, res) => {
  try {
    const reservation = await createReservation(req.body);
    
    // Auto-create pending reward points for this reservation
    if (reservation.ClientId && reservation.requestedCheckout) {
      const points = calculateRewardPoints(reservation.requestedCheckin, reservation.requestedCheckout);
      const nights = Math.ceil((new Date(reservation.requestedCheckout) - new Date(reservation.requestedCheckin)) / (1000 * 60 * 60 * 24));
      
      try {
        await addPendingPoints({
          userId: reservation.ClientId,
          reservationId: reservation.ReservationId,
          amount: points,
          description: `Reservation reward - ${nights} night(s)`,
          availableAt: reservation.requestedCheckout // Points become available at checkout
        });
        console.log(`📊 Pending points created: ${points}p for reservation #${reservation.ReservationId}`);
      } catch (pointsErr) {
        console.error("Error creating pending points:", pointsErr);
        // Don't fail the reservation if points fail, just log it
      }
    }
    
    res.status(201).json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all, with optional userId filter */
reservationRouter.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    let reservations = await getReservations();

    // LOGICĂ: actualizează statusul la 'completed' dacă check-out-ul a trecut
    // și la 'cancelled' dacă nu s-a plătit restul cu 24h înainte de check-in
    const now = new Date();
    for (const r of reservations) {
      // Anulare automat dacă statusul e partial și nu s-a plătit restul cu 24h înainte de check-in
      if (r.status === 'partial' && r.requestedCheckin) {
        const checkinDate = new Date(r.requestedCheckin);
        const diffHours = (checkinDate - now) / (1000 * 60 * 60);
        if (diffHours <= 24 && r.status !== 'cancelled' && r.status !== 'completed') {
          r.status = 'cancelled';
          await r.save();
        }
      }
      // Finalizare automat dacă check-out-ul a trecut și statusul e paid sau partial
      if (r.requestedCheckout && new Date(r.requestedCheckout) < now && (r.status === 'paid' || r.status === 'partial')) {
        r.status = 'completed';
        await r.save();
      }
    }
/* CANCEL endpoint (manual, de către client) - cu penalități */
reservationRouter.put("/:id/cancel", async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "not found" });
    
    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      return res.status(400).json({ message: "Cannot cancel a completed or already cancelled reservation." });
    }

    // Calculează penalitate pe baza timpului
    const now = new Date();
    const checkin = new Date(reservation.requestedCheckin);
    const hoursUntilCheckin = (checkin - now) / (1000 * 60 * 60);
    
    // Fetch invoice pentru a calcula refund
    const Invoice = (await import("../entities/Invoice.js")).default;
    const invoice = await Invoice.findOne({ where: { ReservationId: reservation.ReservationId } });
    
    let refundAmount = 0;
    let penaltyMessage = "";
    
    if (hoursUntilCheckin > 24) {
      // Anulare cu >24h: refund 80%, pierde 20%
      refundAmount = invoice.totalAmount * 0.8;
      penaltyMessage = `Cancellation accepted. You forfeit 20% deposit (€${(invoice.totalAmount * 0.2).toFixed(2)}). Refund: €${refundAmount.toFixed(2)}`;
    } else if (hoursUntilCheckin > 0) {
      // Anulare cu <24h: no refund, pierde tot
      refundAmount = 0;
      penaltyMessage = `Cancellation within 24 hours of check-in. Full payment amount forfeited.`;
    } else {
      // Deja a început sejur
      return res.status(400).json({ message: "Cannot cancel: check-in date has already passed." });
    }
    
    // Setează status la cancelled
    reservation.status = 'cancelled';
    await reservation.save();
    
    console.log(`[CANCEL] Reservation #${reservation.ReservationId} cancelled. ${penaltyMessage}`);
    
    res.status(200).json({
      reservation,
      refundAmount,
      penaltyMessage,
      hoursUntilCheckin: Math.round(hoursUntilCheckin)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

    if (userId) {
      reservations = reservations.filter(r => String(r.ClientId) === String(userId));
    }
    res.status(200).json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /upcoming/:userId - Get next upcoming reservation for a user */
reservationRouter.get("/upcoming/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const reservations = await getReservations();
    
    const now = new Date();
    const upcomingReservations = reservations
      .filter(r => r.ClientId === parseInt(userId) && new Date(r.requestedCheckin) > now && r.status !== 'cancelled')
      .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin));
    
    if (upcomingReservations.length === 0) {
      return res.status(404).json({ message: "No upcoming reservations" });
    }

    const nextReservation = upcomingReservations[0];
    const RoomReservation = require("../entities/RoomReservation.js").default;
    const Room = require("../entities/Room.js").default;
    const RoomTheme = require("../entities/RoomTheme.js").default;
    
    const roomRes = await nextReservation.getRoomReservations({
      include: [
        { model: Room, include: [{ model: RoomTheme }] }
      ]
    });
    
    const fullData = {
      ...nextReservation.toJSON(),
      room: roomRes && roomRes.length > 0 ? roomRes[0].Room : null
    };

    res.status(200).json(fullData);
  } catch (err) {
    console.error("[RESERVATION] Error getting upcoming:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

/* READ by ID */

// Logging suplimentar pentru debugging
reservationRouter.get("/:id", async (req, res) => {
  try {
    console.log(`[RESERVATION] GET /api/reservations/${req.params.id}`);
    const reservation = await getReservationById(req.params.id);
    if (!reservation) {
      console.warn(`[RESERVATION] Rezervare ${req.params.id} nu a fost găsită!`);
      return res.status(404).json({ message: "not found" });
    }
    
    const Invoice = (await import("../entities/Invoice.js")).default;
    const Payment = (await import("../entities/Payment.js")).default;
    
    // LOGICĂ: actualizează statusul pe baza datelor check-in/check-out
    const now = new Date();
    const checkin = new Date(reservation.requestedCheckin);
    const checkout = new Date(reservation.requestedCheckout);
    
    let newStatus = reservation.status;
    
    // AUTO-CANCEL: dacă e check-in și nu e plătit 100%
    if (now >= checkin && now < checkout && reservation.status !== 'completed' && reservation.status !== 'cancelled') {
      const invoice = await Invoice.findOne({ where: { ReservationId: reservation.ReservationId } });
      if (invoice) {
        // Calculează suma plătită
        const payments = await Payment.findAll({ where: { InvoiceId: invoice.InvoiceId } });
        const paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        if (paidAmount < invoice.totalAmount) {
          // Nu e plătit integral la check-in - AUTO-CANCEL
          newStatus = 'cancelled';
          console.log(`[AUTO-CANCEL] Reservation #${reservation.ReservationId} auto-cancelled at check-in. Paid: €${paidAmount}, Required: €${invoice.totalAmount}`);
        } else {
          newStatus = 'active';
        }
      }
    } else if (checkout < now) {
      // După checkout = COMPLETED
      newStatus = "completed";
    } else if (checkin <= now && now < checkout) {
      // În sejur (între checkin și checkout) = ACTIVE
      newStatus = "active";
    } else if (now < checkin) {
      // Înainte de checkin = UPCOMING
      newStatus = "upcoming";
    }
    
    // Actualizează dacă statusul s-a schimbat
    if (newStatus !== reservation.status) {
      reservation.status = newStatus;
      await reservation.save();
      console.log(`[RESERVATION] Status actualizat la '${newStatus}' pentru rezervarea ${reservation.ReservationId}`);
    }
    
    // Log suplimentar pentru debugging
    console.log(`[RESERVATION] Rezervare găsită:`, JSON.stringify(reservation, null, 2));
    res.status(200).json(reservation);
  } catch (err) {
    console.error(`[RESERVATION] Eroare la GET /api/reservations/:id`, err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

/* UPDATE */
reservationRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateReservation(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
reservationRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteReservation(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default reservationRouter;
