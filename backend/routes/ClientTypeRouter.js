// backend/routes/clientTypeRouter.js
import express from "express";
import {
  createClientType,
  getClientTypeByTip,
  getClientTypes,
  updateClientType,
  deleteClientType
} from "../dataAccess/ClientTypeDA.js";

const clientTypeRouter = express.Router();

/* CREATE ClientType */
clientTypeRouter.post("/", async (req, res) => {
  try {
    const clientType = await createClientType(req.body);
    res.status(201).json(clientType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all ClientTypes */
clientTypeRouter.get("/", async (req, res) => {
  try {
    const types = await getClientTypes();
    res.status(200).json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ ClientType by tip */
clientTypeRouter.get("/:tip", async (req, res) => {
  try {
    const type = await getClientTypeByTip(req.params.tip);
    if (!type) return res.status(404).json({ message: "not found" });
    res.status(200).json(type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE ClientType */
clientTypeRouter.put("/:tip", async (req, res) => {
  try {
    const updated = await updateClientType(req.params.tip, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE ClientType */
clientTypeRouter.delete("/:tip", async (req, res) => {
  try {
    const deleted = await deleteClientType(req.params.tip);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default clientTypeRouter;
