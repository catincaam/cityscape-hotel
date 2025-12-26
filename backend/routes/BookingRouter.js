// backend/routes/BookingRouter.js
import express from "express";
import { createInvoice, getInvoiceByReservationId, getRemainingAmount } from "../dataAccess/InvoiceDA.js";
import { createPayment } from "../dataAccess/PaymentDA.js";
import { createReservation, getReservationById } from "../dataAccess/ReservationDA.js";
import { addServiceToReservation } from "../dataAccess/ReservationServiceDA.js";
import { getServiceById } from "../dataAccess/ServiceDA.js";
import { createRoomReservation } from "../dataAccess/RoomReservationDA.js";

const bookingRouter = express.Router();

/* CREATE COMPLETE BOOKING - Rezervare + Factură + Plată inițială */
bookingRouter.post("/complete", async (req, res) => {
  try {
    const {
      // Reservation data
      reservationDate,
      requestedCheckin,
      requestedCheckout,
      bookingMethod,
      ClientId,
      RoomId,
      nrPeople,
      
      // Invoice data
      totalAmount,
      
      // Payment data
      paymentAmount,  // poate fi parțial sau complet
      paymentType,     // "partial" sau "full"
      
      // Services data
      services  // { serviceId: quantity }
    } = req.body;

    // 1. Creare Rezervare
    const reservation = await createReservation({
      reservationDate: reservationDate || new Date(),
      requestedCheckin,
      requestedCheckout,
      bookingMethod: bookingMethod || "online",
      nrPeople: nrPeople || 1,
      ClientId
    });

    // 1.5. Asociază camera cu rezervarea (RoomReservation)
    if (RoomId) {
      await createRoomReservation({
        ReservationId: reservation.ReservationId,
        RoomId: RoomId
      });
    }

    // 2. Adaugă serviciile la rezervare
    const reservationServices = [];
    if (services && Object.keys(services).length > 0) {
      for (const [serviceId, quantity] of Object.entries(services)) {
        if (quantity > 0) {
          // Obține prețul serviciului pentru a-l salva
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

    // 3. Creare Factură
    const invoice = await createInvoice({
      issueDate: new Date(),
      totalAmount,
      status: paymentAmount >= totalAmount ? "paid" : "partial",
      ReservationId: reservation.ReservationId
    });

    // 4. Creare Plată inițială
    const payment = await createPayment({
      amount: paymentAmount,
      paymentDate: new Date(),
      InvoiceId: invoice.InvoiceId,
      paymentType: paymentType || (paymentAmount >= totalAmount ? "full" : "partial")
    });

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
