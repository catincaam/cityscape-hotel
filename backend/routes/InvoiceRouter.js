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

const money = (value) => `${Number(value || 0).toFixed(2)}\u00A0EUR`;

const drawLabel = (doc, label, value, x, y, width = 140, options = {}) => {
  doc.fontSize(options.labelSize || 6.8).font("Helvetica-Bold").fillColor(options.labelColor || "#a67f54")
    .text(label.toUpperCase(), x, y, { width, characterSpacing: options.spacing || 1.35 });
  doc.fontSize(options.valueSize || 10).font(options.valueFont || "Helvetica-Bold").fillColor(options.valueColor || "#101827")
    .text(value || "-", x, y + (options.valueOffset || 13), { width, lineGap: 2 });
};

const drawLineItem = (doc, y, description, meta, amount, options = {}) => {
  const height = options.height || 54;
  doc.roundedRect(60, y, 476, height, 12).fill(options.fill || "#fffdfa");
  doc.roundedRect(60, y, 4, height, 2).fill(options.accent || "#d7b98c");
  doc.strokeColor(options.border || "#efe4d5").lineWidth(0.8)
    .roundedRect(60, y, 476, height, 12).stroke();

  doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#101827")
    .text(description, 82, y + 13, { width: 290, lineGap: 2 });
  if (meta) {
    doc.fontSize(8).font("Helvetica").fillColor("#7c6d5e")
      .text(meta, 82, y + 31, { width: 290, lineGap: 2 });
  }
  doc.roundedRect(404, y + 15, 106, 26, 8).fill(options.amountFill || "#f8f1e8");
  doc.fontSize(10).font("Helvetica-Bold").fillColor(options.amountColor || "#9a6f36")
    .text(money(amount), 414, y + 23, { width: 86, align: "right" });
};

const drawMetricCard = (doc, label, value, x, y, width) => {
  doc.roundedRect(x, y, width, 68, 12).fill("#fbf8f3");
  doc.strokeColor("#f0e5d6").lineWidth(0.7).roundedRect(x, y, width, 68, 12).stroke();
  drawLabel(doc, label, value, x + 18, y + 18, width - 36, {
    labelColor: "#b08455",
    valueSize: 10.5,
    valueOffset: 15
  });
};

const drawInvoiceTableRow = (doc, y, description, meta, quantity, unitPrice, amount, options = {}) => {
  if (options.fill) {
    doc.rect(54, y - 10, 488, 42).fill(options.fill);
  }

  doc.fontSize(9.5).font("Helvetica").fillColor("#111827")
    .text(description, 72, y, { width: 230, lineGap: 2 });
  if (meta) {
    doc.fontSize(8.5).font("Helvetica").fillColor("#9ca3af")
      .text(meta, 72, y + 16, { width: 230, lineGap: 2 });
  }
  doc.fontSize(9).font("Helvetica").fillColor("#111827")
    .text(String(quantity), 320, y + 4, { width: 30, align: "center" });
  doc.text(money(unitPrice), 358, y + 4, { width: 80, align: "right" });
  doc.font("Helvetica-Bold")
    .text(money(amount), 446, y + 4, { width: 96, align: "right" });
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
    const accommodationTotal = Math.max(0, totalAmount - servicesTotal);
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

    doc.rect(0, 0, 595, 842).fill("#f7f5f1");
    doc.rect(42, 34, 511, 790).fill("#ffffff");

    doc.fontSize(27).font("Times-Roman").fillColor("#8a6428")
      .text("Cityscape Hotel", 84, 88);
    doc.fontSize(10).font("Helvetica").fillColor("#8a6428")
      .text("BOUTIQUE RESIDENCY", 85, 121, { characterSpacing: 3.2 });
    doc.fontSize(9).font("Helvetica").fillColor("#3f4854")
      .text("18 Grand Avenue", 84, 156)
      .text("Bucharest, Romania", 84, 174)
      .text("+40 31 456 7890", 84, 198)
      .text("concierge@cityscapehotel.com", 84, 216);

    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("INVOICE NUMBER", 402, 90, { width: 104, align: "right", characterSpacing: 1.1 });
    doc.fontSize(17).font("Times-Roman").fillColor("#0f172a")
      .text(`INV-${String(invoice.InvoiceId).padStart(4, "0")}`, 382, 108, { width: 124, align: "right" });
    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("DATE OF ISSUE", 402, 142, { width: 104, align: "right", characterSpacing: 1.1 });
    doc.fontSize(10).font("Helvetica").fillColor("#0f172a")
      .text(formatDate(invoice.issueDate || new Date()), 382, 160, { width: 124, align: "right" });
    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("RESERVATION REF", 392, 194, { width: 114, align: "right", characterSpacing: 1.1 });
    doc.fontSize(10).font("Helvetica").fillColor("#0f172a")
      .text(`#${reservationCode}`, 382, 212, { width: 124, align: "right" });

    doc.moveTo(84, 260).lineTo(506, 260).strokeColor("#eee8df").lineWidth(1).stroke();

    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("GUEST DETAILS", 84, 308, { characterSpacing: 1.4 });
    doc.moveTo(84, 326).lineTo(155, 326).strokeColor("#d9c5a8").lineWidth(1).stroke();
    doc.fontSize(18).font("Times-Roman").fillColor("#0f172a")
      .text(guestName, 84, 344, { width: 210 });
    doc.fontSize(10).font("Helvetica").fillColor("#3f4854")
      .text(client?.Email || "-", 84, 369, { width: 210 });

    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("STAY SUMMARY", 316, 308, { characterSpacing: 1.4 });
    doc.moveTo(316, 326).lineTo(388, 326).strokeColor("#d9c5a8").lineWidth(1).stroke();
    doc.fontSize(10).font("Helvetica").fillColor("#0f172a")
      .text(roomTitle, 316, 344, { width: 190 });
    doc.text(`${formatDate(reservation.requestedCheckin)} - ${formatDate(reservation.requestedCheckout)}`, 316, 365, { width: 190 });
    doc.fillColor("#9ca3af")
      .text(`${nights} Night${nights === 1 ? "" : "s"} | ${reservation.nrPeople || 1} Guest${reservation.nrPeople === 1 ? "" : "s"}`, 316, 384, { width: 190 });

    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("DESCRIPTION", 84, 432, { characterSpacing: 1.4 });
    doc.text("QTY", 320, 432, { width: 30, align: "center", characterSpacing: 1.4 });
    doc.text("UNIT PRICE", 358, 432, { width: 80, align: "right", characterSpacing: 1.4 });
    doc.text("AMOUNT", 446, 432, { width: 96, align: "right", characterSpacing: 1.4 });
    doc.moveTo(84, 454).lineTo(542, 454).strokeColor("#eee8df").lineWidth(1).stroke();

    let rowY = 482;
    drawInvoiceTableRow(
      doc,
      rowY,
      `Accommodation: ${roomTitle}`,
      `${formatDate(reservation.requestedCheckin)} - ${formatDate(reservation.requestedCheckout)} Stay`,
      nights,
      accommodationTotal / nights,
      accommodationTotal
    );
    rowY += 46;

    reservationServices.slice(0, 3).forEach((item, index) => {
      const serviceName = item.Service?.name || item.Service?.serviceName || `Service #${item.ServiceId}`;
      const serviceMeta = item.Service?.description || "Reserved hotel experience - payable at hotel";
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      drawInvoiceTableRow(doc, rowY, serviceName, serviceMeta, quantity, unitPrice, quantity * unitPrice, {
        fill: index % 2 === 0 ? "#fbfaf8" : null
      });
      rowY += 46;
    });

    const totalsY = Math.min(Math.max(rowY + 18, 622), 646);
    doc.moveTo(84, totalsY).lineTo(542, totalsY).strokeColor("#eee8df").lineWidth(1).stroke();

    doc.roundedRect(84, totalsY + 28, 184, 72, 3).fill("#f3f0ea");
    doc.circle(108, totalsY + 54, 8).fill("#9a6f36");
    doc.fontSize(10).font("Helvetica").fillColor("#9a6f36")
      .text("LOYALTY ACCRUAL", 126, totalsY + 48, { characterSpacing: 1.1 });
    doc.fontSize(9).font("Helvetica").fillColor("#0f172a")
      .text(`${Math.round(totalAmount * 10).toLocaleString("en-US")} Cityscape Points will be added when your stay begins.`, 108, totalsY + 74, {
        width: 136,
        lineGap: 3
      });

    const summaryX = 332;
    const taxAmount = 0;
    doc.fontSize(10).font("Helvetica").fillColor("#3f4854")
      .text("SUBTOTAL", summaryX, totalsY + 28, { width: 92, characterSpacing: 1.1 })
      .text(money(totalAmount), 432, totalsY + 28, { width: 110, align: "right" })
      .text("VAT", summaryX, totalsY + 52, { width: 92, characterSpacing: 1.1 })
      .text(money(taxAmount), 432, totalsY + 52, { width: 110, align: "right" })
      .text("PAID", summaryX, totalsY + 76, { width: 92, characterSpacing: 1.1 })
      .text(money(paidAmount), 432, totalsY + 76, { width: 110, align: "right" });
    doc.moveTo(summaryX, totalsY + 98).lineTo(542, totalsY + 98).strokeColor("#d9c5a8").lineWidth(1).stroke();
    doc.fontSize(13).font("Times-Italic").fillColor("#9a6f36")
      .text("Total Amount", summaryX, totalsY + 112, { width: 120 });
    doc.fontSize(totalAmount >= 10000 ? 18 : 22).font("Helvetica-Bold").fillColor("#0f172a")
      .text(money(totalAmount), 374, totalsY + 132, { width: 168, align: "right" });

    const isPaid = remainingAmount <= 0;
    doc.rect(332, totalsY + 164, 210, 26).fill("#f7f3ed");
    doc.fontSize(9).font("Helvetica").fillColor(isPaid ? "#065f46" : "#9a3412")
      .text(`STATUS: ${isPaid ? "PAID IN FULL" : "PARTIALLY PAID"}`, 332, totalsY + 173, {
        width: 210,
        align: "center",
        characterSpacing: 1.4
      });

    doc.fontSize(12).font("Times-Italic").fillColor("#9a6f36")
      .text("\"In the heart of the city, every stay finds its quiet.\"", 92, totalsY + 122, { width: 190, align: "center" });

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
