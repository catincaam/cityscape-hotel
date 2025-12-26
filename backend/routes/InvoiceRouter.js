// backend/routes/invoiceRouter.js
import express from "express";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoice,
  deleteInvoice
} from "../dataAccess/InvoiceDA.js";

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
