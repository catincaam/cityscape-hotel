// backend/routes/consumedServiceRouter.js
import express from "express";
import {
  createConsumedService,
  getConsumedService,
  getConsumedServices,
  updateConsumedService,
  deleteConsumedService
} from "../dataAccess/ConsumedServiceDA.js";

const consumedServiceRouter = express.Router();

/* CREATE */
consumedServiceRouter.post("/", async (req, res) => {
  try {
    const consumed = await createConsumedService(req.body);
    res.status(201).json(consumed);
  } catch (err) {
    console.error(err);
    // Returnează eroare clară pentru frontend
    res.status(400).json({ message: err.message || "server error" });
  }
});

/* READ all */
consumedServiceRouter.get("/", async (req, res) => {
  try {
    const consumedList = await getConsumedServices();
    res.status(200).json(consumedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by invoiceId + serviceId */
consumedServiceRouter.get("/:invoiceId/:serviceId", async (req, res) => {
  try {
    const { invoiceId, serviceId } = req.params;
    const consumed = await getConsumedService(invoiceId, serviceId);
    if (!consumed) return res.status(404).json({ message: "not found" });
    res.status(200).json(consumed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
consumedServiceRouter.put("/:invoiceId/:serviceId", async (req, res) => {
  try {
    const { invoiceId, serviceId } = req.params;
    const updated = await updateConsumedService(invoiceId, serviceId, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
consumedServiceRouter.delete("/:invoiceId/:serviceId", async (req, res) => {
  try {
    const { invoiceId, serviceId } = req.params;
    const deleted = await deleteConsumedService(invoiceId, serviceId);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default consumedServiceRouter;
