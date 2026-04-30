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
import { getClientById } from "../dataAccess/ClientDA.js";

const invoiceRouter = express.Router();

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

const money = (value) => `${Number(value || 0).toFixed(2)} EUR`;

const drawLabel = (doc, label, value, x, y, width = 140) => {
  doc.fontSize(7).font("Helvetica-Bold").fillColor("#9a7b55")
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 1.2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#111827")
    .text(value || "-", x, y + 13, { width });
};

const drawLineItem = (doc, y, description, meta, amount, options = {}) => {
  doc.roundedRect(54, y, 488, 46, 6).fill(options.fill || "#ffffff");
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#111827")
    .text(description, 72, y + 12, { width: 300 });
  if (meta) {
    doc.fontSize(8).font("Helvetica").fillColor("#6b7280")
      .text(meta, 72, y + 27, { width: 300 });
  }
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#9a6f36")
    .text(money(amount), 380, y + 18, { width: 140, align: "right" });
};

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
    const reservation = await getReservationById(req.params.reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const client = await getClientById(reservation.ClientId);

    const RoomReservation = (await import("../entities/RoomReservation.js")).default;
    const Room = (await import("../entities/Room.js")).default;
    const RoomTheme = (await import("../entities/RoomTheme.js")).default;
    const Invoice = (await import("../entities/Invoice.js")).default;
    const Payment = (await import("../entities/Payment.js")).default;
    const ReservationService = (await import("../entities/ReservationService.js")).default;
    const Service = (await import("../entities/Service.js")).default;

    const roomReservation = await RoomReservation.findOne({
      where: { ReservationId: reservation.ReservationId }
    });
    const room = roomReservation ? await Room.findByPk(roomReservation.RoomId) : null;
    const theme = room?.RoomThemeId ? await RoomTheme.findByPk(room.RoomThemeId) : null;

    const invoice = await Invoice.findOne({
      where: { ReservationId: reservation.ReservationId }
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const payments = await Payment.findAll({
      where: { InvoiceId: invoice.InvoiceId }
    });
    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = remainingAmount <= 0 ? "Fully paid" : "Partially paid";

    const reservationServices = await ReservationService.findAll({
      where: { ReservationId: reservation.ReservationId },
      include: [{ model: Service, required: false }]
    }).catch(() => []);
    const servicesTotal = reservationServices.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    const nights = Math.max(1, Math.ceil(
      (new Date(reservation.requestedCheckout) - new Date(reservation.requestedCheckin)) /
      (1000 * 60 * 60 * 24)
    ));
    const accommodationTotal = totalAmount;
    const reservationCode = `RES-${String(reservation.ReservationId).padStart(4, "0")}`;
    const roomTitle = theme?.name || "Cityscape room";
    const guestName = [client?.FirstName, client?.LastName].filter(Boolean).join(" ") || "Guest";

    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${reservation.ReservationId}.pdf`
    );

    doc.pipe(res);

    doc.rect(0, 0, 595, 842).fill("#f7f3ed");
    doc.roundedRect(34, 34, 527, 774, 18).fill("#fffdf9");

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#9a6f36")
      .text("CITYSCAPE HOTEL", 54, 62, { characterSpacing: 2.5 });
    doc.fontSize(34).font("Helvetica").fillColor("#111827")
      .text("Invoice", 54, 86);
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280")
      .text("Reservation payment receipt", 56, 128);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#9a7b55")
      .text(`INVOICE #${String(invoice.InvoiceId).padStart(5, "0")}`, 380, 68, { width: 145, align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280")
      .text(formatDate(invoice.issueDate || new Date()), 380, 84, { width: 145, align: "right" });
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#111827")
      .text(`#${reservationCode}`, 380, 112, { width: 145, align: "right" });

    doc.moveTo(54, 158).lineTo(542, 158).strokeColor("#e7d8c4").lineWidth(1).stroke();

    drawLabel(doc, "Guest", guestName, 54, 184, 190);
    drawLabel(doc, "Email", client?.Email || "-", 54, 226, 220);
    drawLabel(doc, "Room", roomTitle, 312, 184, 210);
    drawLabel(doc, "Guests", `${reservation.nrPeople || 1} guest${reservation.nrPeople === 1 ? "" : "s"}`, 312, 226, 160);

    doc.roundedRect(54, 286, 488, 82, 10).fill("#f8f4ee");
    drawLabel(doc, "Check-in", formatDate(reservation.requestedCheckin), 78, 310, 130);
    drawLabel(doc, "Check-out", formatDate(reservation.requestedCheckout), 230, 310, 130);
    drawLabel(doc, "Duration", `${nights} night${nights === 1 ? "" : "s"}`, 382, 310, 120);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#9a7b55")
      .text("BILLING DETAILS", 54, 405, { characterSpacing: 1.4 });

    let rowY = 432;
    drawLineItem(
      doc,
      rowY,
      "Room accommodation",
      `${roomTitle} - ${nights} night${nights === 1 ? "" : "s"}`,
      accommodationTotal
    );
    rowY += 54;

    if (reservationServices.length > 0) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#9a7b55")
        .text("SERVICES RESERVED - PAYABLE AT HOTEL", 54, rowY + 4, { characterSpacing: 1.1 });
      rowY += 26;

      reservationServices.forEach((item) => {
        const serviceName = item.Service?.name || item.Service?.serviceName || `Service #${item.ServiceId}`;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        drawLineItem(doc, rowY, serviceName, `${quantity} x ${money(unitPrice)}`, quantity * unitPrice, {
          fill: "#fbfaf7"
        });
        rowY += 54;
      });
    }

    doc.roundedRect(54, rowY + 10, 488, 88, 10).fill("#111827");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#d6b98b")
      .text("TOTAL DUE NOW", 78, rowY + 34, { characterSpacing: 1.3 });
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#ffffff")
      .text(money(totalAmount), 300, rowY + 27, { width: 210, align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#d1d5db")
      .text(`Paid: ${money(paidAmount)}   Remaining: ${money(remainingAmount)}`, 78, rowY + 60);

    const statusY = rowY + 122;
    doc.roundedRect(54, statusY, 488, 54, 10).fill(remainingAmount <= 0 ? "#ecfdf5" : "#fff7ed");
    doc.fontSize(9).font("Helvetica-Bold").fillColor(remainingAmount <= 0 ? "#047857" : "#9a3412")
      .text("PAYMENT STATUS", 78, statusY + 14, { characterSpacing: 1.3 });
    doc.fontSize(13).font("Helvetica-Bold").fillColor(remainingAmount <= 0 ? "#065f46" : "#7c2d12")
      .text(paymentStatus, 78, statusY + 29);

    doc.moveTo(54, 744).lineTo(542, 744).strokeColor("#e7d8c4").lineWidth(1).stroke();
    doc.fontSize(8).font("Helvetica").fillColor("#6b7280")
      .text("Thank you for choosing Cityscape Hotel.", 54, 762, { width: 488, align: "center" });
    doc.fontSize(7).fillColor("#9ca3af")
      .text("This invoice was generated automatically by the Cityscape Hotel reservation system.", 54, 778, {
        width: 488,
        align: "center"
      });

    doc.end();
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
