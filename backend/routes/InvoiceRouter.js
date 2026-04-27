// backend/routes/invoiceRouter.js
import express from "express";
import PDFDocument from "pdfkit";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoice,
  deleteInvoice
} from "../dataAccess/InvoiceDA.js";
import { getReservationById } from "../dataAccess/ReservationDA.js";
import { getRoomById } from "../dataAccess/RoomDA.js";
import { getClientById } from "../dataAccess/ClientDA.js";

const invoiceRouter = express.Router();

/* CREATE */
invoiceRouter.post("/", async (req, res) => {
  try {
    const invoice = await createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
invoiceRouter.get("/", async (req, res) => {
  try {
    const invoices = await getInvoices();
    res.status(200).json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DOWNLOAD PDF - MUST BE BEFORE /:id route */
invoiceRouter.get("/:reservationId/download-pdf", async (req, res) => {
  try {
    console.log("[PDF] Starting download for reservation:", req.params.reservationId);
    
    const reservation = await getReservationById(req.params.reservationId);
    if (!reservation) {
      console.error("[PDF] Reservation not found");
      return res.status(404).json({ message: "Reservation not found" });
    }
    console.log("[PDF] Reservation found:", reservation.ReservationId);

    const client = await getClientById(reservation.ClientId);
    console.log("[PDF] Client:", client?.FirstName);
    
    // Get room via RoomReservation
    const RoomReservation = (await import("../entities/RoomReservation.js")).default;
    const roomRes = await RoomReservation.findOne({
      where: { ReservationId: reservation.ReservationId }
    });
    const room = roomRes ? await getRoomById(roomRes.RoomId) : null;
    console.log("[PDF] Room:", room?.name);

    // Get invoice via reservation
    const Invoice = (await import("../entities/Invoice.js")).default;
    const invoice = await Invoice.findOne({
      where: { ReservationId: reservation.ReservationId }
    });

    if (!invoice) {
      console.error("[PDF] Invoice not found");
      return res.status(404).json({ message: "Invoice not found" });
    }
    console.log("[PDF] Invoice:", invoice.InvoiceId);

    // Get payment info
    const Payment = (await import("../entities/Payment.js")).default;
    const payments = await Payment.findAll({
      where: { InvoiceId: invoice.InvoiceId }
    });
    const paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    console.log("[PDF] Payments:", payments.length, "Total paid:", paidAmount);

    // Create PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${reservation.ReservationId}.pdf`
    );

    doc.pipe(res);
    console.log("[PDF] PDF creation started");

    // ============ HEADER ============
    doc.rect(0, 0, 612, 110).fill("#c9a86a");
    
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#ffffff")
      .text("CITYSCAPE HOTEL", { align: "center", y: 25 });
    doc.fontSize(10).font("Helvetica").fillColor("#fffbf7")
      .text("Luxury Collection", { align: "center" });
    
    doc.fontSize(8).fillColor("#f5f0eb")
      .text("Your Perfect Stay Awaits", { align: "center" });

    doc.fillColor("#000000");
    doc.y = 120;

    // ============ INVOICE HEADER ============
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1f2937").text("INVOICE", 50);
    
    const headerY = doc.y - 16;
    doc.fontSize(9).font("Helvetica").fillColor("#9ca3af");
    doc.text(`Invoice #: INV-${String(reservation.ReservationId).padStart(6, "0")}`, {
      align: "right",
      y: headerY,
      width: 512
    });
    doc.text(
      `Date: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      { align: "right", width: 512 }
    );

    doc.moveDown(1.5);

    // ============ TWO COLUMN INFO ============
    const col1X = 50;
    const col2X = 320;

    // Left Column - Guest
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("GUEST", col1X);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1f2937");
    doc.text(`${client?.FirstName || ""} ${client?.LastName || ""}`, col1X);
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280");
    if (client?.email) doc.text(client.email, col1X);

    // Right Column - Reservation
    const leftColY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("RESERVATION", col2X, leftColY - 19);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1f2937");
    doc.text(`ID: ${reservation.ReservationId}`, col2X, leftColY - 10);
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280");
    doc.text(`Room: ${room?.name || "N/A"}`, col2X);
    
    const nights = Math.ceil(
      (new Date(reservation.requestedCheckout) -
        new Date(reservation.requestedCheckin)) /
        (1000 * 60 * 60 * 24)
    );
    
    doc.text(`Check-in: ${new Date(reservation.requestedCheckin).toLocaleDateString()}`, col2X);
    doc.text(`Check-out: ${new Date(reservation.requestedCheckout).toLocaleDateString()}`, col2X);
    doc.text(`${nights} night${nights > 1 ? "s" : ""} • ${reservation.nrPeople} guest${reservation.nrPeople > 1 ? "s" : ""}`, col2X);

    doc.moveDown(2);

    // ============ DIVIDER ============
    doc.strokeColor("#e5d5c8").lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1.5);

    // ============ BILLING TABLE ============
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("BILLING DETAILS", 50);
    doc.moveDown(0.8);

    const tableY = doc.y;
    const tableWidth = 512;
    const rowHeight = 30;

    // Header
    doc.fillColor("#f5f0eb");
    doc.rect(50, tableY, tableWidth, rowHeight).fill();
    doc.strokeColor("#e5d5c8").lineWidth(0.5);
    doc.rect(50, tableY, tableWidth, rowHeight).stroke();
    
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280");
    doc.text("Description", 60, tableY + 9);
    doc.text("Amount", 480, tableY + 9, { align: "right" });

    // Calculate costs
    const roomCost = parseFloat(invoice.totalAmount) * 0.85;
    const tax = parseFloat(invoice.totalAmount) * 0.15;

    // Row 1 - Room
    const row1Y = tableY + rowHeight;
    doc.fillColor("#ffffff");
    doc.rect(50, row1Y, tableWidth, rowHeight).fill();
    doc.strokeColor("#e5d5c8").lineWidth(0.5);
    doc.rect(50, row1Y, tableWidth, rowHeight).stroke();
    
    doc.fontSize(9).font("Helvetica").fillColor("#1f2937");
    doc.text(`Room Accommodation (${nights} night${nights > 1 ? "s" : ""})`, 60, row1Y + 9);
    doc.font("Helvetica-Bold").fillColor("#c9a86a");
    doc.text(`€${roomCost.toFixed(2)}`, 480, row1Y + 9, { align: "right" });

    // Row 2 - Taxes
    const row2Y = row1Y + rowHeight;
    doc.fillColor("#fafaf9");
    doc.rect(50, row2Y, tableWidth, rowHeight).fill();
    doc.strokeColor("#e5d5c8").lineWidth(0.5);
    doc.rect(50, row2Y, tableWidth, rowHeight).stroke();
    
    doc.fontSize(9).font("Helvetica").fillColor("#1f2937");
    doc.text("Taxes & Service Fees", 60, row2Y + 9);
    doc.font("Helvetica-Bold").fillColor("#c9a86a");
    doc.text(`€${tax.toFixed(2)}`, 480, row2Y + 9, { align: "right" });

    // Total Box
    const totalY = row2Y + rowHeight;
    doc.fillColor("#fffbf7");
    doc.rect(50, totalY, tableWidth, 45).fill();
    doc.strokeColor("#c9a86a").lineWidth(2);
    doc.rect(50, totalY, tableWidth, 45).stroke();
    
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280");
    doc.text("TOTAL DUE", 60, totalY + 8);
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#c9a86a");
    doc.text(`€${parseFloat(invoice.totalAmount).toFixed(2)}`, 480, totalY + 10, {
      align: "right"
    });

    doc.y = totalY + 50;
    doc.moveDown(1);

    // ============ PAYMENT STATUS ============
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280").text("PAYMENT STATUS", 50);
    doc.moveDown(0.6);

    const statusBoxY = doc.y;
    const statusColor = invoice.status === "paid" ? "#ecfdf5" : "#fef2f2";
    const statusTextColor = invoice.status === "paid" ? "#065f46" : "#991b1b";
    const statusBorderColor = invoice.status === "paid" ? "#10b981" : "#dc2626";

    doc.fillColor(statusColor).rect(50, statusBoxY, 512, 35).fill();
    doc.strokeColor(statusBorderColor).lineWidth(1.5);
    doc.rect(50, statusBoxY, 512, 35).stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor(statusTextColor);
    doc.text(`Amount Paid: €${paidAmount.toFixed(2)}`, 60, statusBoxY + 6);
    doc.text(`Status: ${invoice.status === "paid" ? "FULLY PAID" : "PENDING"}`, 60, statusBoxY + 19);

    doc.moveDown(3);

    // ============ FOOTER ============
    doc.strokeColor("#e5d5c8").lineWidth(0.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    
    doc.moveDown(1);
    doc.fontSize(8).font("Helvetica").fillColor("#9ca3af").text(
      "Thank you for choosing Cityscape Hotel. We look forward to welcoming you!",
      { align: "center" }
    );
    doc.fontSize(8).fillColor("#d1d5db").text("reservations@cityscape-hotel.com  |  +1 (555) 123-4567", {
      align: "center",
    });
    doc.fontSize(7).fillColor("#d1d5db");
    doc.moveDown(0.5);
    doc.text("This is an automatically generated invoice. No signature required.", {
      align: "center",
    });

    // Finalize PDF
    doc.end();
    console.log("[PDF] PDF finalized and sent");
  } catch (err) {
    console.error("[PDF ERROR] Full error:", err);
    console.error("[PDF ERROR] Stack:", err.stack);
    res.status(500).json({ message: "Error generating PDF", error: err.message });
  }
});

/* READ by ID */
invoiceRouter.get("/:id", async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "not found" });
    res.status(200).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
invoiceRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateInvoice(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
invoiceRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteInvoice(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default invoiceRouter;
