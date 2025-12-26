// backend/routes/paymentRouter.js
import express from "express";
import {
  createPayment,
  getPaymentById,
  getPayments,
  updatePayment,
  deletePayment
} from "../dataAccess/PaymentDA.js";

const paymentRouter = express.Router();

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
