// backend/routes/clientRouter.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  createClient,
  getClientById,
  getClientByEmail,
  getClients,
  updateClient,
  deleteClient
} from "../dataAccess/ClientDA.js";

const clientRouter = express.Router();

/* CREATE client */
clientRouter.post("/", async (req, res) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all clients */
clientRouter.get("/", async (req, res) => {
  try {
    const clients = await getClients();
    res.status(200).json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ client by ID */
clientRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const client = await getClientById(req.params.id);
    if (!client) return res.status(404).json({ message: "not found" });
    res.status(200).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ client by email */
clientRouter.get("/email/:email", async (req, res) => {
  try {
    const client = await getClientByEmail(req.params.email);
    if (!client) return res.status(404).json({ message: "not found" });
    res.status(200).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE client */
clientRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updated = await updateClient(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE client */
clientRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await deleteClient(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default clientRouter;
