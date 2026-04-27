// backend/routes/clientRouter.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";
import Reservation from "../entities/Reservation.js";
import { Op } from "sequelize";

import {
  createClient,
  getClientById,
  getClientByEmail,
  getClients,
  updateClient,
  deleteClient
} from "../dataAccess/ClientDA.js";

const clientRouter = express.Router();

function sanitizeClient(client) {
  if (!client) return null;
  const values = client.dataValues || client;
  const { Password, ...safeClient } = values;
  return safeClient;
}

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

/* READ current client */
clientRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const client = await getClientById(req.client.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json(sanitizeClient(client));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE current client */
clientRouter.put("/me", authMiddleware, async (req, res) => {
  try {
    const client = await getClientById(req.client.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const {
      firstName,
      lastName,
      email,
      profilePicture,
      currentPassword,
      newPassword
    } = req.body;

    const updates = {};
    if (typeof firstName === "string" && firstName.trim()) updates.FirstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) updates.LastName = lastName.trim();
    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await getClientByEmail(normalizedEmail);
      if (existing && String(existing.ClientId) !== String(client.ClientId)) {
        return res.status(409).json({ message: "Email is already used by another account." });
      }
      updates.Email = normalizedEmail;
    }
    if (typeof profilePicture === "string") updates.profilePicture = profilePicture;

    if (newPassword) {
      if (String(newPassword).length < 8) {
        return res.status(400).json({ message: "New password must have at least 8 characters." });
      }
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to change your password." });
      }
      const passwordOk = await bcrypt.compare(currentPassword, client.Password || "");
      if (!passwordOk) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
      updates.Password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await updateClient(req.client.id, updates);
    res.status(200).json(sanitizeClient(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE current client */
clientRouter.delete("/me", authMiddleware, async (req, res) => {
  try {
    const blockingReservation = await Reservation.findOne({
      where: {
        ClientId: req.client.id,
        status: { [Op.ne]: "cancelled" },
        requestedCheckout: { [Op.gte]: new Date() }
      }
    });

    if (blockingReservation) {
      return res.status(409).json({
        message: "You cannot delete your account while you have upcoming or active reservations."
      });
    }

    const deleted = await deleteClient(req.client.id);
    if (!deleted) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "deleted" });
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
    res.status(200).json(sanitizeClient(client));
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
    res.status(200).json(sanitizeClient(client));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE client */
clientRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (String(req.client.id) !== String(req.params.id)) {
      return res.status(403).json({ message: "You can only update your own profile." });
    }
    const updated = await updateClient(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(sanitizeClient(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE client */
clientRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (String(req.client.id) !== String(req.params.id)) {
      return res.status(403).json({ message: "You can only delete your own profile." });
    }
    const blockingReservation = await Reservation.findOne({
      where: {
        ClientId: req.params.id,
        status: { [Op.ne]: "cancelled" },
        requestedCheckout: { [Op.gte]: new Date() }
      }
    });

    if (blockingReservation) {
      return res.status(409).json({
        message: "You cannot delete your account while you have upcoming or active reservations."
      });
    }

    const deleted = await deleteClient(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default clientRouter;
