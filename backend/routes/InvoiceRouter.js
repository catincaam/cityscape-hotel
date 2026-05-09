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

    doc.rect(0, 0, 595, 842).fill("#f2ede5");
    doc.circle(76, 82, 58).fill("#eadcc8");
    doc.circle(538, 762, 86).fill("#efe4d5");
    doc.roundedRect(30, 28, 535, 786, 24).fill("#fffdfa");
    doc.rect(30, 28, 10, 786).fill("#d0a66f");

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#b08455")
      .text("CITYSCAPE HOTEL", 62, 62, { characterSpacing: 3.2 });
    doc.fontSize(36).font("Times-Roman").fillColor("#0f172a")
      .text("Invoice", 62, 86);
    doc.fontSize(9).font("Helvetica").fillColor("#7c6d5e")
      .text("Reservation payment receipt", 64, 129);

    doc.roundedRect(386, 58, 130, 74, 14).fill("#f8f1e8");
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#a67f54")
      .text("INVOICE", 404, 74, { width: 94, align: "right", characterSpacing: 1.6 });
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a")
      .text(`#${String(invoice.InvoiceId).padStart(5, "0")}`, 404, 89, { width: 94, align: "right" });
    doc.fontSize(8).font("Helvetica").fillColor("#7c6d5e")
      .text(formatDate(invoice.issueDate || new Date()), 404, 106, { width: 94, align: "right" });

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a")
      .text(`#${reservationCode}`, 390, 145, { width: 126, align: "right" });
    doc.moveTo(62, 168).lineTo(532, 168).strokeColor("#eadcc8").lineWidth(1).stroke();

    doc.roundedRect(62, 192, 470, 86, 16).fill("#ffffff");
    doc.strokeColor("#f0e5d6").lineWidth(0.8).roundedRect(62, 192, 470, 86, 16).stroke();
    drawLabel(doc, "Guest", guestName, 84, 212, 190);
    drawLabel(doc, "Email", client?.Email || "-", 84, 248, 210);
    drawLabel(doc, "Room", roomTitle, 326, 212, 178);
    drawLabel(doc, "Guests", `${reservation.nrPeople || 1} guest${reservation.nrPeople === 1 ? "" : "s"}`, 326, 248, 160);

    drawMetricCard(doc, "Check-in", formatDate(reservation.requestedCheckin), 62, 304, 146);
    drawMetricCard(doc, "Check-out", formatDate(reservation.requestedCheckout), 224, 304, 146);
    drawMetricCard(doc, "Duration", `${nights} night${nights === 1 ? "" : "s"}`, 386, 304, 146);

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#a67f54")
      .text("BILLING DETAILS", 62, 404, { characterSpacing: 1.8 });

    let rowY = 430;
    drawLineItem(
      doc,
      rowY,
      "Room accommodation",
      `${roomTitle} - ${nights} night${nights === 1 ? "" : "s"}`,
      accommodationTotal,
      { fill: "#ffffff", accent: "#d0a66f" }
    );
    rowY += 66;

    if (reservationServices.length > 0) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#a67f54")
        .text("SERVICES RESERVED - PAYABLE AT HOTEL", 62, rowY + 4, { characterSpacing: 1.45 });
      rowY += 28;

      reservationServices.forEach((item) => {
        const serviceName = item.Service?.name || item.Service?.serviceName || `Service #${item.ServiceId}`;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        drawLineItem(doc, rowY, serviceName, `${quantity} x ${money(unitPrice)}`, quantity * unitPrice, {
          fill: "#fffdfa",
          accent: "#b78a55",
          amountFill: "#fbf2e6"
        });
        rowY += 66;
      });
    }

    rowY = Math.min(rowY, 596);
    doc.roundedRect(62, rowY + 4, 470, 90, 16).fill("#0f172a");
    doc.roundedRect(62, rowY + 4, 470, 90, 16).strokeColor("#0f172a").stroke();
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#d9b77e")
      .text("TOTAL DUE NOW", 84, rowY + 30, { characterSpacing: 1.6 });
    doc.fontSize(28).font("Helvetica-Bold").fillColor("#ffffff")
      .text(money(totalAmount), 300, rowY + 24, { width: 198, align: "right" });
    doc.fontSize(8.5).font("Helvetica").fillColor("#cbd5e1")
      .text(`Paid ${money(paidAmount)}   |   Remaining ${money(remainingAmount)}`, 84, rowY + 59);

    const statusY = rowY + 118;
    const isPaid = remainingAmount <= 0;
    doc.roundedRect(62, statusY, 470, 58, 14).fill(isPaid ? "#eafaf1" : "#fff7ed");
    doc.strokeColor(isPaid ? "#b9efd0" : "#fed7aa").lineWidth(0.8).roundedRect(62, statusY, 470, 58, 14).stroke();
    doc.circle(86, statusY + 29, 10).fill(isPaid ? "#10b981" : "#f59e0b");
    doc.fontSize(8).font("Helvetica-Bold").fillColor(isPaid ? "#047857" : "#9a3412")
      .text("PAYMENT STATUS", 108, statusY + 15, { characterSpacing: 1.5 });
    doc.fontSize(13).font("Helvetica-Bold").fillColor(isPaid ? "#065f46" : "#7c2d12")
      .text(paymentStatus, 108, statusY + 31);

    doc.moveTo(62, 744).lineTo(532, 744).strokeColor("#eadcc8").lineWidth(1).stroke();
    doc.fontSize(8).font("Helvetica").fillColor("#7c6d5e")
      .text("Thank you for choosing Cityscape Hotel.", 62, 762, { width: 470, align: "center" });
    doc.fontSize(7).fillColor("#a8a29e")
      .text("This invoice was generated automatically by the Cityscape Hotel reservation system.", 62, 778, {
        width: 470,
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
