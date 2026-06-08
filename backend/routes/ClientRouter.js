// backend/routes/clientRouter.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";
import Reservation from "../entities/Reservation.js";
import { Op } from "sequelize";
import { sendAccountDeletedEmail } from "../services/emailService.js";

import {
  createClient,
  getClientById,
  getClientByEmail,
  getClients,
  updateClient,
  deleteClient
} from "../dataAccess/ClientDA.js";
import {
  isStrongPassword,
  isValidEmail,
  isValidPersonName,
  normalizeEmail
} from "../utils/validators.js";

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
    const email = normalizeEmail(req.body.Email || req.body.email);
    const firstName = req.body.FirstName || req.body.firstName;
    const lastName = req.body.LastName || req.body.lastName;
    if (!isValidEmail(email) || !isValidPersonName(firstName) || !isValidPersonName(lastName)) {
      return res.status(400).json({ message: "Client must have a valid first name, last name and email." });
    }
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
    if (typeof firstName === "string" && firstName.trim()) {
      if (!isValidPersonName(firstName)) {
        return res.status(400).json({ message: "First name must have at least 3 letters and cannot contain numbers or special symbols." });
      }
      updates.FirstName = firstName.trim();
    }
    if (typeof lastName === "string" && lastName.trim()) {
      if (!isValidPersonName(lastName)) {
        return res.status(400).json({ message: "Last name must have at least 3 letters and cannot contain numbers or special symbols." });
      }
      updates.LastName = lastName.trim();
    }
    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }
      const existing = await getClientByEmail(normalizedEmail);
      if (existing && String(existing.ClientId) !== String(client.ClientId)) {
        return res.status(409).json({ message: "Email is already used by another account." });
      }
      updates.Email = normalizedEmail;
    }
    if (typeof profilePicture === "string") updates.profilePicture = profilePicture;

    if (newPassword) {
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: "New password must have at least 8 characters, one uppercase letter and one number." });
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
        status: { [Op.notIn]: ["cancelled", "canceled"] }
      }
    });

    if (blockingReservation) {
      return res.status(409).json({
        message: "You cannot delete your account while you have reservations on your profile."
      });
    }

    const client = await getClientById(req.client.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const deleted = await deleteClient(req.client.id);
    if (!deleted) return res.status(404).json({ message: "Client not found" });

    const emailResult = await sendAccountDeletedEmail({ client });
    if (!emailResult.success) {
      console.warn("[ACCOUNT DELETED EMAIL] Not sent:", emailResult.error);
    }

    res.status(200).json({
      message: "deleted",
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      }
    });
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
    const updates = { ...req.body };
    const firstName = updates.FirstName || updates.firstName;
    const lastName = updates.LastName || updates.lastName;
    const email = updates.Email || updates.email;
    if (firstName && !isValidPersonName(firstName)) {
      return res.status(400).json({ message: "First name must have at least 3 letters and cannot contain numbers or special symbols." });
    }
    if (lastName && !isValidPersonName(lastName)) {
      return res.status(400).json({ message: "Last name must have at least 3 letters and cannot contain numbers or special symbols." });
    }
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }
      updates.Email = normalizedEmail;
      delete updates.email;
    }

    const updated = await updateClient(req.params.id, updates);
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
        status: { [Op.notIn]: ["cancelled", "canceled"] }
      }
    });

    if (blockingReservation) {
      return res.status(409).json({
        message: "You cannot delete your account while you have reservations on your profile."
      });
    }

    const client = await getClientById(req.params.id);
    if (!client) return res.status(404).json({ message: "not found" });

    const deleted = await deleteClient(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });

    const emailResult = await sendAccountDeletedEmail({ client });
    if (!emailResult.success) {
      console.warn("[ACCOUNT DELETED EMAIL] Not sent:", emailResult.error);
    }

    res.status(200).json({
      message: "deleted",
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default clientRouter;
