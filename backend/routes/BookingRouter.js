
// Endpoint pentru admin: toate rezervările cu user, temă, date, preț, status, avatar
import Client from "../entities/Client.js";
import RoomTheme from "../entities/RoomTheme.js";
import Room from "../entities/Room.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import express from "express";
import { createInvoice, getInvoiceByReservationId, getRemainingAmount } from "../dataAccess/InvoiceDA.js";
import { createPayment } from "../dataAccess/PaymentDA.js";
import { createReservation, getReservationById } from "../dataAccess/ReservationDA.js";
import { addServiceToReservation } from "../dataAccess/ReservationServiceDA.js";
import { getServiceById } from "../dataAccess/ServiceDA.js";
import { createRoomReservation } from "../dataAccess/RoomReservationDA.js";

const bookingRouter = express.Router();

// GET /api/admin/bookings
bookingRouter.get("/admin/bookings", async (req, res) => {
  try {
    const invoiceModel = (await import("../entities/Invoice.js")).default;
    const Payment = (await import("../entities/Payment.js")).default;
    
    // Query Reservations WITH required:false to include ALL reservations
    const reservations = await Reservation.findAll({
      include: [
        {
          model: Client,
          attributes: ["ClientId", "FirstName", "LastName"]
        },
        {
          model: RoomReservation,
          required: false,  // LEFT JOIN - include even without RoomReservation
          include: [
            {
              model: Room,
              required: false,
              include: [
                {
                  model: RoomTheme,
                  required: false,
                  attributes: ["name", "city", "theme"]
                }
              ]
            }
          ]
        },
        {
          model: invoiceModel,
          required: false,
          attributes: ["InvoiceId", "totalAmount", "status"],
          include: [
            {
              model: Payment,
              required: false,
              attributes: ["id", "amount"],
              as: "payments"
            }
          ]
        }
      ],
      order: [['ReservationId', 'DESC']]
    });

    console.log("[ADMIN BOOKINGS] Total reservations found:", reservations.length);
    
    // Map to frontend format
    const bookings = reservations.map((r, idx) => {
      const client = r.Client || {};
      const roomRes = r.RoomReservations && r.RoomReservations[0];
      const room = roomRes && roomRes.Room;
      const theme = room && room.RoomTheme;
      const invoice = r.Invoice || {};
      
      // DEBUG: Log which ones have theme
      if (!theme) {
        console.log(`[BOOKING ${r.ReservationId}] NO THEME - RoomReservations:`, r.RoomReservations?.length || 0, "Room:", !!room);
      }
      
      // Extract plain theme name
      const themeName = theme ? (theme.dataValues?.name || theme.name) : "-";
      
      // Price from Invoice
      let totalPrice = "-";
      if (invoice.totalAmount) {
        totalPrice = invoice.totalAmount;
      }
      
      // Calculate total payments AND payment status
      const payments = invoice.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAmount = parseFloat(totalPrice) || 0;
      const depositRequired = totalAmount * 0.2;
      const remainingDue = totalAmount - totalPaid;
      
      // ===== NEW: Calculate payment status =====
      let paymentStatus = "pending";
      if (totalPaid >= totalAmount) {
        paymentStatus = "full_payment";
      } else if (totalPaid >= depositRequired && totalPaid > 0) {
        paymentStatus = "deposit_paid";
      } else if (totalPaid > 0 && totalPaid < depositRequired) {
        paymentStatus = "partial_payment";
      }
      
      // Calculate hours until check-in
      const now = new Date();
      const checkinDate = new Date(r.requestedCheckin);
      const hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
      
      // Format dates
      const checkin = r.requestedCheckin?.toISOString().slice(0, 10) || "N/A";
      const checkout = r.requestedCheckout?.toISOString().slice(0, 10) || "N/A";
      const dates = `${checkin} - ${checkout}`;
      
      // Calculate reservation status dynamically
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkoutDate = new Date(r.requestedCheckout);
      checkoutDate.setHours(0, 0, 0, 0);
      const checkinDateNormalized = new Date(r.requestedCheckin);
      checkinDateNormalized.setHours(0, 0, 0, 0);
      
      let status = "Pending";
      if (r.status === "cancelled") {
        status = "Cancelled";
      } else if (checkoutDate < today) {
        status = "Completed";
      } else if (checkinDateNormalized <= today && today <= checkoutDate) {
        status = "Active";
      } else if (checkinDateNormalized > today) {
        status = "Upcoming";
      }
      
      return {
        bookingId: `#BK-${String(r.ReservationId).padStart(4, "0")}`,
        guestName: client.FirstName ? `${client.FirstName} ${client.LastName}` : "-",
        guestAvatar: "/assets/profilePicture.jpg",
        roomTheme: themeName,
        dates: dates,
        totalPrice: totalPrice,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingDue: Math.max(0, Math.round(remainingDue * 100) / 100),
        status: status,
        // NEW: Payment info
        paymentStatus: paymentStatus,
        depositRequired: Math.round(depositRequired * 100) / 100,
        hoursUntilCheckin: Math.round(hoursUntilCheckin * 100) / 100
      };
    });

    console.log("[ADMIN BOOKINGS] Returning bookings count:", bookings.length);

    // Force conversion to plain JSON
    res.json(JSON.parse(JSON.stringify(bookings)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* CREATE COMPLETE BOOKING - Rezervare + Factură + Plată inițială */
bookingRouter.post("/complete", async (req, res) => {
  try {

    const {
      reservationDate,
      requestedCheckin,
      requestedCheckout,
      bookingMethod,
      ClientId,
      RoomId,
      nrPeople,
      totalAmount,
      paymentAmount,
      paymentType,
      services 
    } = req.body;

    // Validare: nu permite rezervare fără cameră
    if (!RoomId) {
      return res.status(400).json({ message: "RoomId is required. You must select a room for the reservation." });
    }

    // VALIDARE: Minim 20% deposit OBLIGATORIU
    const minimumDeposit = totalAmount * 0.2;
    if (paymentAmount < minimumDeposit) {
      return res.status(400).json({ 
        message: `Minimum 20% deposit required. You must pay at least €${minimumDeposit.toFixed(2)} out of €${totalAmount}`,
        minimumRequired: minimumDeposit,
        totalAmount: totalAmount
      });
    }

    const reservation = await createReservation({
      reservationDate: reservationDate || new Date(),
      requestedCheckin,
      requestedCheckout,
      bookingMethod: bookingMethod || "online",
      nrPeople: nrPeople || 1,
      ClientId
    });

    await createRoomReservation({
      ReservationId: reservation.ReservationId,
      RoomId: RoomId
    });

    const reservationServices = [];
    if (services && Object.keys(services).length > 0) {
      for (const [serviceId, quantity] of Object.entries(services)) {
        if (quantity > 0) {
          const serviceData = await getServiceById(serviceId);
          const resService = await addServiceToReservation({
            ReservationId: reservation.ReservationId,
            ServiceId: parseInt(serviceId),
            quantity: quantity,
            unitPrice: serviceData?.price || 0
          });
          reservationServices.push(resService);
        }
      }
    }

    const invoice = await createInvoice({
      issueDate: new Date(),
      totalAmount,
      status: paymentAmount >= totalAmount ? "paid" : "partial",
      ReservationId: reservation.ReservationId
    });

    const payment = await createPayment({
      amount: paymentAmount,
      paymentDate: new Date(),
      InvoiceId: invoice.InvoiceId,
      paymentType: paymentType || (paymentAmount >= totalAmount ? "full" : "partial")
    });

    // Actualizează statusul rezervării nach o payment
    const newStatus = paymentAmount >= totalAmount ? "completed" : "active";
    await reservation.update({ status: newStatus });

    res.status(201).json({
      reservation,
      reservationServices,
      invoice,
      payment,
      remainingAmount: totalAmount - paymentAmount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* GET BOOKING SUMMARY - pentru pagina de confirmare */
bookingRouter.get("/summary/:reservationId", async (req, res) => {
  try {
    const reservationId = req.params.reservationId;
    
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const invoice = await getInvoiceByReservationId(reservationId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const remainingAmount = await getRemainingAmount(invoice.InvoiceId);

    res.status(200).json({
      reservation,
      invoice,
      payments: invoice.payments,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      remainingAmount,
      isPaid: remainingAmount <= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ADD ADDITIONAL PAYMENT - pentru plăți ulterioare */
bookingRouter.post("/payment/:invoiceId", async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentType } = req.body;

    const invoice = await getInvoiceByReservationId(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const remainingAmount = await getRemainingAmount(invoiceId);
    
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        message: "Payment amount exceeds remaining balance",
        remainingAmount
      });
    }

    const payment = await createPayment({
      amount,
      paymentDate: new Date(),
      InvoiceId: invoiceId,
      paymentType: paymentType || "additional"
    });

    // Update invoice status if fully paid
    const newRemainingAmount = remainingAmount - amount;
    if (newRemainingAmount <= 0) {
      await updateInvoice(invoiceId, { status: "paid" });
    }

    res.status(201).json({
      payment,
      remainingAmount: newRemainingAmount,
      isPaid: newRemainingAmount <= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* GET RESERVATION BY ID - pentru adăugare servicii */
bookingRouter.get("/reservation/:reservationId", async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found with this ID" });
    }

    const invoice = await getInvoiceByReservationId(reservation.ReservationId);
    const remainingAmount = invoice ? await getRemainingAmount(invoice.InvoiceId) : 0;

    res.status(200).json({
      reservation,
      invoice,
      remainingAmount,
      canAddServices: remainingAmount >= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default bookingRouter;
