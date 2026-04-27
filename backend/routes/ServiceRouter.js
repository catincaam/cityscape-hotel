import express from "express";
import {
  createService,
  updateService,
  getServices,
  deleteService
} from "../dataAccess/ServiceDA.js";

const serviceRouter = express.Router();

/* CREATE */
serviceRouter.post("/", async (req, res) => {
  try {
    const service = await createService(req.body);
    res.status(201).json(service);
  } catch (err) {
    console.error("❌ Service create error:", err.message);
    res.status(400).json({ message: err.message });
  }
});

/* UPDATE */
serviceRouter.put("/:id", async (req, res) => {
  try {
    const service = await updateService(req.params.id, req.body);
    res.json(service);
  } catch (err) {
    console.error("❌ Service update error:", err.message);
    res.status(400).json({ message: err.message });
  }
});

/* READ ALL */
serviceRouter.get("/", async (req, res) => {
  const services = await getServices();
  res.json(services);
});

/* DELETE */
serviceRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteService(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "deleted" });
  } catch (err) {
    if (err.code === 'HAS_RESERVATIONS') {
      return res.status(400).json({ message: err.message });
    }
    console.error("❌ Service delete error:", err.message);
    res.status(500).json({ message: "Eroare la ștergere serviciu.", detail: err.message });
  }
});

export default serviceRouter;
