// backend/routes/reservationRouter.js
import express from "express";
import { Op } from "sequelize";
import {
  createReservation,
  getReservationById,
  getReservations,
  updateReservation,
  deleteReservation
} from "../dataAccess/ReservationDA.js";
import { addPendingPoints } from "../dataAccess/RewardPointDA.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import { getRoomDisplayImage, normalizeThemeImages } from "../utils/themeImage.js";
import { syncReservationStatus, syncReservationStatuses } from "../services/reservationStatusService.js";

const reservationRouter = express.Router();

// IMPORTANT: This route is for ADMIN CRUD operations ONLY!
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
    // Block creation if no payment or invoice info
    const { invoice, payment, totalAmount, paymentAmount } = req.body;
    // Accept either direct fields or nested objects
    const amount = totalAmount || invoice?.totalAmount;
    const paid = paymentAmount || payment?.amount;
    if (!amount || !paid || paid < amount * 0.2) {
      return res.status(400).json({
        message: "Reservation must have at least 20% payment to be saved. Incomplete/abandoned bookings are not stored.",
        minimumRequired: amount ? amount * 0.2 : undefined,
        totalAmount: amount
      });
    }

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

    await syncReservationStatuses(reservations);

    if (userId) {
      reservations = reservations.filter(r => String(r.ClientId) === String(userId));
    }
    res.status(200).json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* CANCEL endpoint (manual, de cÄƒtre client) - cu penalitÄƒÈ›i */
reservationRouter.put("/:id/cancel", async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "not found" });
    await syncReservationStatus(reservation);
    
    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      return res.status(400).json({ message: "Cannot cancel a completed or already cancelled reservation." });
    }

    // CalculeazÄƒ penalitate pe baza timpului
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
      penaltyMessage = `Cancellation accepted. You forfeit 20% deposit (â‚¬${(invoice.totalAmount * 0.2).toFixed(2)}). Refund: â‚¬${refundAmount.toFixed(2)}`;
    } else if (hoursUntilCheckin > 0) {
      // Anulare cu <24h: no refund, pierde tot
      refundAmount = 0;
      penaltyMessage = `Cancellation within 24 hours of check-in. Full payment amount forfeited.`;
    } else {
      // Deja a Ã®nceput sejur
      return res.status(400).json({ message: "Cannot cancel: check-in date has already passed." });
    }
    
    // SeteazÄƒ status la cancelled
    reservation.status = 'cancelled';
    await reservation.save();
    
    
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

/* GET /user/:userId - Get ALL reservations for user with full room & theme data */
reservationRouter.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const Invoice = (await import("../entities/Invoice.js")).default;

    const reservations = await Reservation.findAll({
      where: { ClientId: userId },
      include: [
        {
          model: RoomReservation,
          required: false,
          include: [
            {
              model: Room,
              required: false,
              include: [
                {
                  model: RoomTheme,
                  required: false
                }
              ]
            }
          ]
        },
        {
          model: Invoice,
          required: false,
          attributes: ["InvoiceId", "totalAmount", "status"]
        }
      ],
      order: [["requestedCheckin", "DESC"]]
    });

    await syncReservationStatuses(reservations);

    res.status(200).json(reservations);
  } catch (err) {
    console.error("[RESERVATION] Error getting user reservations:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

/* GET /upcoming/:userId - Get next upcoming reservation for a user */
reservationRouter.get("/upcoming/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const userReservations = await Reservation.findAll({ where: { ClientId: userId } });
    await syncReservationStatuses(userReservations, now);
    
    // Find next upcoming reservation for this user - FILTER for future dates FIRST
    // Skip pending (incomplete) reservations - only get confirmed/paid ones with rooms assigned
    const nextReservation = await Reservation.findOne({
      where: {
        ClientId: userId,
        status: "upcoming",
        requestedCheckin: { [Op.gt]: now }
      },
      order: [["requestedCheckin", "ASC"]],
      raw: false
    });
    
    if (!nextReservation) {
      return res.status(404).json({ message: "No upcoming reservations" });
    }

    res.status(200).json(nextReservation);
  } catch (err) {
    console.error("[RESERVATION] Error in /upcoming/:userId:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

reservationRouter.get("/:id", async (req, res) => {
  try {
    
    // Fetch cu toate relaÈ›iile necesare
    const Reservation = (await import("../entities/Reservation.js")).default;
    const Invoice = (await import("../entities/Invoice.js")).default;
    
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        {
          association: 'RoomReservations',
          include: [
            {
              association: 'Room',
              include: [
                { 
                  association: 'RoomTheme',
                  include: [
                    { association: 'images', required: false }
                  ],
                  required: false
                }
              ],
              required: false
            }
          ],
          required: false
        },
        { 
          association: 'Invoice',
          include: [
            { association: 'payments', required: false }
          ],
          required: false 
        }
      ]
    });
    
    if (reservation && reservation.RoomReservations && reservation.RoomReservations[0]) {
      const room = reservation.RoomReservations[0].Room;
      const theme = room?.RoomTheme;
      if (!theme?.images) {
        // If images aren't included, fetch them separately
        if (theme) {
          const RoomImage = (await import("../entities/RoomImage.js")).default;
          const images = await RoomImage.findAll({ where: { RoomThemeId: theme.RoomThemeId } });
          theme.images = images;
        }
      }

      if (theme) {
        const normalizedImages = normalizeThemeImages(theme, theme.images || []);
        theme.images = normalizedImages;
        theme.showcaseImage = getRoomDisplayImage(theme, normalizedImages);
      }
    }
    
    if (!reservation) {
      console.warn(`[RESERVATION] Rezervare ${req.params.id} nu a fost gÄƒsitÄƒ!`);
      return res.status(404).json({ message: "not found" });
    }
    
    
    await syncReservationStatus(reservation);

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
