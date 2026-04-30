
// Endpoint pentru admin: toate rezervările cu user, temă, date, preț, status, avatar
import Client from "../entities/Client.js";
import RoomTheme from "../entities/RoomTheme.js";
import Room from "../entities/Room.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import express from "express";
import { Op } from "sequelize";
import { createInvoice, getInvoiceByReservationId, getRemainingAmount } from "../dataAccess/InvoiceDA.js";
import { createPayment } from "../dataAccess/PaymentDA.js";
import { createReservation, getReservationById } from "../dataAccess/ReservationDA.js";
import { addServiceToReservation } from "../dataAccess/ReservationServiceDA.js";
import { getServiceById } from "../dataAccess/ServiceDA.js";
import { createRoomReservation } from "../dataAccess/RoomReservationDA.js";
import { sendReservationConfirmation } from "../services/emailService.js";
import {
  isFutureExpiry,
  isPositiveInteger,
  isPositiveNumber,
  isValidCardNumber,
  isValidCvc,
  isValidDateRange
} from "../utils/validators.js";

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
                  attributes: ["name", "city", "theme", "showcaseImage"]
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
    
    // Map all bookings except ghost (for total)
    const allBookings = reservations.map((r, idx) => {
      const client = r.Client || {};
      const roomRes = r.RoomReservations && r.RoomReservations[0];
      const room = roomRes && roomRes.Room;
      const theme = room && room.RoomTheme;
      const invoice = r.Invoice || {};
      const themeName = theme ? (theme.dataValues?.name || theme.name) : "-";
      const showcaseImg = theme ? (theme.dataValues?.showcaseImage || theme.showcaseImage) : null;
      let totalPrice = "-";
      if (invoice.totalAmount) {
        totalPrice = invoice.totalAmount;
      }
      const payments = invoice.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAmount = parseFloat(totalPrice) || 0;
      const depositRequired = totalAmount * 0.2;
      const remainingDue = totalAmount - totalPaid;
      let paymentStatus = "pending";
      if (totalPaid >= totalAmount) {
        paymentStatus = "full_payment";
      } else if (totalPaid >= depositRequired && totalPaid > 0) {
        paymentStatus = "deposit_paid";
      } else if (totalPaid > 0 && totalPaid < depositRequired) {
        paymentStatus = "partial_payment";
      }
      const now = new Date();
      const checkinDate = new Date(r.requestedCheckin);
      const hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
      const checkin = r.requestedCheckin?.toISOString().slice(0, 10) || "N/A";
      const checkout = r.requestedCheckout?.toISOString().slice(0, 10) || "N/A";
      const dates = `${checkin} - ${checkout}`;
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
        reservationId: r.ReservationId,
        bookingId: `#BK-${String(r.ReservationId).padStart(4, "0")}`,
        guestName: client.FirstName ? `${client.FirstName} ${client.LastName}` : "-",
        guestAvatar: "/assets/profilePicture.jpg",
        roomTheme: themeName,
        roomImage: showcaseImg ? `http://localhost:9001${showcaseImg}` : null,
        dates: dates,
        totalPrice: totalPrice,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingDue: Math.max(0, Math.round(remainingDue * 100) / 100),
        status: status,
        paymentStatus: paymentStatus,
        depositRequired: Math.round(depositRequired * 100) / 100,
        hoursUntilCheckin: Math.round(hoursUntilCheckin * 100) / 100,
        createdAt: r.createdAt
      };
    })
    // FILTER: exclude abandoned/ghost bookings. A real booking needs a valid
    // invoice and at least the required 20% deposit paid.
    .filter(b => {
      const price = parseFloat(b.totalPrice);
      const paid = parseFloat(b.totalPaid);
      const depositRequired = parseFloat(b.depositRequired);
      return (
        price &&
        !isNaN(price) &&
        price > 0 &&
        paid >= depositRequired
      );
    });

    // Active stays: the guest is effectively in-house now.
    const activeBookings = allBookings.filter(b => {
      return b.status === "Active";
    });

    // Projected revenue: total contractual value if non-cancelled stays complete.
    const projectedRevenue = allBookings.reduce((sum, b) => {
      if (b.status?.toLowerCase() === "cancelled") return sum;
      return sum + (parseFloat(b.totalPrice) || 0);
    }, 0);

    // Cash received: recognize money only once the stay has started.
    // This avoids treating deposits for future stays as earned hotel revenue.
    const totalCashReceived = allBookings.reduce((sum, b) => {
      if (b.status?.toLowerCase() === 'cancelled') return sum;
      const paid = parseFloat(b.totalPaid);
      if (!["active", "completed"].includes(b.status?.toLowerCase())) return sum;
      if (!paid) return sum;
      return sum + paid;
    }, 0);

    console.log("[ADMIN BOOKINGS] Returning allBookings:", allBookings.length, "activeBookings:", activeBookings.length, "projectedRevenue:", projectedRevenue, "totalCashReceived:", totalCashReceived);
    res.json({
      allBookings: JSON.parse(JSON.stringify(allBookings)),
      activeBookings: JSON.parse(JSON.stringify(activeBookings)),
      stats: {
        totalBookings: allBookings.length,
        activeStays: activeBookings.length,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        cashReceived: Math.round(totalCashReceived * 100) / 100
      },
      totalCashReceived: Math.round(totalCashReceived * 100) / 100
    });
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
      cardNumber,
      cardExpiry,
      cardCVC,
      services 
    } = req.body;

    // Validare: nu permite rezervare fără cameră
    if (!RoomId) {
      return res.status(400).json({ message: "RoomId is required. You must select a room for the reservation." });
    }

    if (!ClientId) {
      return res.status(400).json({ message: "ClientId is required." });
    }

    if (!isValidDateRange(requestedCheckin, requestedCheckout)) {
      return res.status(400).json({ message: "Check-in must be before check-out." });
    }

    if (!isPositiveInteger(nrPeople)) {
      return res.status(400).json({ message: "Number of guests must be a positive number." });
    }

    if (!isPositiveNumber(totalAmount) || !isPositiveNumber(paymentAmount)) {
      return res.status(400).json({ message: "Payment values must be positive numbers." });
    }

    const client = await Client.findByPk(ClientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    const room = await Room.findByPk(RoomId, { include: [RoomTheme] });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const maxGuests = Number(room.RoomTheme?.maxGuests || 1);
    if (Number(nrPeople) > maxGuests) {
      return res.status(400).json({ message: `This room allows a maximum of ${maxGuests} guest${maxGuests === 1 ? "" : "s"}.` });
    }

    const overlappingRoomReservations = await RoomReservation.findAll({
      where: { RoomId },
      attributes: ["ReservationId"]
    });
    const overlappingReservationIds = overlappingRoomReservations.map((item) => item.ReservationId);

    if (overlappingReservationIds.length > 0) {
      const existingReservation = await Reservation.findOne({
        where: {
          ReservationId: { [Op.in]: overlappingReservationIds },
          status: { [Op.notIn]: ["cancelled", "pending"] },
          requestedCheckin: { [Op.lt]: requestedCheckout },
          requestedCheckout: { [Op.gt]: requestedCheckin }
        }
      });

      if (existingReservation) {
        return res.status(409).json({
          message: "This room is no longer available for the selected dates. Please choose another room."
        });
      }
    }

    // ===== STEP 1: VALIDATE PAYMENT FIRST (Mock validation) =====
    console.log("[BOOKING] Processing payment for amount:", paymentAmount);
    
    // Mock card validation
    if (!cardNumber || !cardExpiry || !cardCVC) {
      return res.status(400).json({ message: "Card details are required" });
    }

    if (!isValidCardNumber(cardNumber)) {
      return res.status(400).json({ message: "Invalid card number format" });
    }

    if (!isFutureExpiry(cardExpiry)) {
      return res.status(400).json({ message: "Invalid or expired card date. Use MM/YY." });
    }

    if (!isValidCvc(cardCVC)) {
      return res.status(400).json({ message: "Invalid CVC format" });
    }

    console.log("[BOOKING] Card validation passed");
    
    // ===== STEP 2: IF PAYMENT VALID - CREATE RESERVATION =====
    
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
        const normalizedQuantity = Number(quantity);
        if (normalizedQuantity > 0) {
          if (!isPositiveInteger(normalizedQuantity)) {
            return res.status(400).json({ message: "Service quantity must be a positive number." });
          }
          const serviceData = await getServiceById(serviceId);
          if (!serviceData || serviceData.status !== "activ" || !serviceData.bookableOnline) {
            return res.status(400).json({ message: "Selected service is not available." });
          }
          if (serviceData.priceType === "per_person" && normalizedQuantity > Number(nrPeople)) {
            return res.status(400).json({ message: "Per-person services cannot exceed the number of guests." });
          }
          const resService = await addServiceToReservation({
            ReservationId: reservation.ReservationId,
            ServiceId: parseInt(serviceId),
            quantity: normalizedQuantity,
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

    // Actualizează statusul rezervării după payment
    const newStatus = paymentAmount >= totalAmount ? "paid" : "partial";
    await reservation.update({ status: newStatus });

    console.log("[BOOKING] Payment processed + Reservation #" + reservation.ReservationId + " created");

    let emailResult = { success: false, error: "Email was not attempted." };
    try {
      const [client, bookedRoom] = await Promise.all([
        Client.findByPk(ClientId),
        Room.findByPk(RoomId)
      ]);
      const bookedTheme = bookedRoom?.RoomThemeId
        ? await RoomTheme.findByPk(bookedRoom.RoomThemeId)
        : null;

      emailResult = await sendReservationConfirmation({
        client,
        reservation,
        room: bookedRoom
          ? { ...bookedRoom.toJSON(), RoomTheme: bookedTheme?.toJSON() }
          : null,
        invoice,
        payment,
        remainingAmount: totalAmount - paymentAmount
      });

      if (!emailResult.success) {
        console.warn("[BOOKING EMAIL] Confirmation email not sent:", emailResult.error);
      }
    } catch (emailError) {
      emailResult = { success: false, error: emailError.message };
      console.error("[BOOKING EMAIL ERROR]", emailError);
    }

    res.status(201).json({
      reservation,
      reservationServices,
      invoice,
      payment,
      remainingAmount: totalAmount - paymentAmount,
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      },
      message: "Booking confirmed! Reservation saved."
    });

  } catch (err) {
    console.error("[BOOKING ERROR]", err);
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
