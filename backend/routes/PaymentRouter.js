// backend/routes/PaymentRouter.js
import express from "express";
import { createPayment, getPaymentById, getPayments, updatePayment, deletePayment } from "../dataAccess/PaymentDA.js";
import Reservation from "../entities/Reservation.js";
import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";
import { awardPointsForCompletedReservation } from "../services/rewardPointsService.js";
import { syncClientTier } from "../services/clientTierService.js";
import { syncReservationStatus } from "../services/reservationStatusService.js";

const paymentRouter = express.Router();

// Utility function: Calculate invoice payment status
async function calculateInvoiceStatus(invoiceId) {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{ model: Payment, as: "payments" }]
  });
  
  if (!invoice) return null;
  
  const totalAmount = parseFloat(invoice.totalAmount) || 0;
  const depositRequired = totalAmount * 0.2;
  const payments = invoice.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  
  let status = "pending";
  if (totalPaid >= totalAmount) {
    status = "full_payment";
  } else if (totalPaid >= depositRequired && totalPaid > 0) {
    status = "deposit_paid";
  } else if (totalPaid > 0) {
    status = "deposit_paid"; // Partial deposit
  }
  
  return { status, totalPaid, depositRequired, totalAmount };
}

// POST /pay-deposit - Pay 20% deposit
paymentRouter.post("/pay-deposit", async (req, res) => {
  try {
    const { ReservationId } = req.body;
    
    const reservation = await Reservation.findByPk(ReservationId, {
      include: [{ model: Invoice, as: "Invoice" }]
    });
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    await syncReservationStatus(reservation);

    if (reservation.status === "cancelled") {
      return res.status(400).json({
        message: "This reservation was cancelled because the final payment deadline has passed."
      });
    }
    
    const invoice = reservation.Invoice;
    if (!invoice) {
      return res.status(400).json({ message: "No invoice for this reservation" });
    }
    
    const depositAmount = (parseFloat(invoice.totalAmount) * 0.2).toFixed(2);
    
    // Create payment record
    const payment = await Payment.create({
      amount: depositAmount,
      paymentDate: new Date(),
      InvoiceId: invoice.InvoiceId,
      paymentType: "deposit"
    });
    
    // Update invoice status
    const invoiceStatus = await calculateInvoiceStatus(invoice.InvoiceId);
    await invoice.update({ status: invoiceStatus.status });
    
    res.status(201).json({
      message: "Deposit payment created",
      payment,
      depositAmount,
      remainingDue: (parseFloat(invoice.totalAmount) * 0.8).toFixed(2),
      invoiceStatus: invoiceStatus.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /pay-final - Pay 80% final payment
paymentRouter.post("/pay-final", async (req, res) => {
  try {
    const { ReservationId } = req.body;
    
    const reservation = await Reservation.findByPk(ReservationId, {
      include: [{ model: Invoice, as: "Invoice" }]
    });
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    const invoice = reservation.Invoice;
    if (!invoice) {
      return res.status(400).json({ message: "No invoice for this reservation" });
    }
    
    // Check 24h deadline
    const checkinDate = new Date(reservation.requestedCheckin);
    const now = new Date();
    const hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilCheckin < 24) {
      await reservation.update({ status: "cancelled" });
      return res.status(400).json({ 
        message: "This reservation was cancelled because the final payment deadline has passed.",
        hoursRemaining: hoursUntilCheckin.toFixed(2)
      });
    }
    
    // Calculate remaining amount
    const totalAmount = parseFloat(invoice.totalAmount);
    const payments = await Payment.findAll({ where: { InvoiceId: invoice.InvoiceId } });
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const finalAmount = (totalAmount - totalPaid).toFixed(2);
    
    if (finalAmount <= 0) {
      return res.status(400).json({ message: "Invoice already paid in full" });
    }
    
    // Create payment record
    const payment = await Payment.create({
      amount: finalAmount,
      paymentDate: new Date(),
      InvoiceId: invoice.InvoiceId,
      paymentType: "final"
    });
    
    // Update invoice status
    const invoiceStatus = await calculateInvoiceStatus(invoice.InvoiceId);
    await invoice.update({ status: invoiceStatus.status });
    
    // Mark reservation as COMPLETED and award reward points
    let rewardResult = null;
    let clientTier = null;
    if (invoiceStatus.status === "full_payment") {
      const checkoutDate = new Date(reservation.requestedCheckout);
      const nextStatus = checkoutDate < new Date() ? "completed" : "paid";
      await reservation.update({ status: nextStatus });
      
      // Award reward points for completed reservation
      if (nextStatus === "completed") {
        rewardResult = await awardPointsForCompletedReservation(ReservationId, reservation.ClientId);
        clientTier = await syncClientTier(reservation.ClientId);
      }
      console.log(`Reservation #${ReservationId} payment completed. Status: ${reservation.status}. Points awarded:`, rewardResult);
    }

    res.status(201).json({
      message: "Final payment created",
      payment,
      totalPaid: totalAmount,
      invoiceStatus: invoiceStatus.status,
      reservationStatus: reservation.status,
      rewardPoints: rewardResult ? {
        points: rewardResult.points,
        breakdown: rewardResult.breakdown,
        message: `🎉 Felicitări! Ai câștigat ${rewardResult.points} puncte!`
      } : null,
      clientTier
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /status/:ReservationId - Get payment status for a reservation
paymentRouter.get("/status/:ReservationId", async (req, res) => {
  try {
    const { ReservationId } = req.params;
    
    const reservation = await Reservation.findByPk(ReservationId, {
      include: [{ model: Invoice, as: "Invoice" }]
    });
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    await syncReservationStatus(reservation);
    
    const invoice = reservation.Invoice;
    if (!invoice) {
      return res.status(400).json({ message: "No invoice for this reservation" });
    }
    
    const invoiceStatus = await calculateInvoiceStatus(invoice.InvoiceId);
    const checkinDate = new Date(reservation.requestedCheckin);
    const now = new Date();
    const hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
    
    res.status(200).json({
      ReservationId,
      invoiceStatus: invoiceStatus.status,
      totalAmount: invoiceStatus.totalAmount,
      depositRequired: invoiceStatus.depositRequired,
      totalPaid: invoiceStatus.totalPaid,
      remainingDue: (invoiceStatus.totalAmount - invoiceStatus.totalPaid).toFixed(2),
      hoursUntilCheckin: hoursUntilCheckin.toFixed(2),
      canPayFinal: hoursUntilCheckin >= 24,
      canCancel: hoursUntilCheckin >= 24 ? "full_refund" : "partial_refund"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* LEGACY CRUD - Keep for backward compatibility */

/* CREATE */
paymentRouter.post("/", async (req, res) => {
  try {
    const payment = await createPayment(req.body);
    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
paymentRouter.get("/", async (req, res) => {
  try {
    const payments = await getPayments();
    res.status(200).json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
paymentRouter.get("/:id", async (req, res) => {
  try {
    const payment = await getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ message: "not found" });
    res.status(200).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
paymentRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updatePayment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
paymentRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deletePayment(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default paymentRouter;
