import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getClientByEmail, createClient } from "../dataAccess/ClientDA.js";

const authRouter = express.Router();

/* =========================
   REGISTER CLIENT
   POST /api/auth/register
========================= */
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, typeClientTip } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Email, password, first and last name required" });
    }

    const existing = await getClientByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Client already exists" });
    }

    const PasswordHash = await bcrypt.hash(password, 10);

    const client = await createClient({
      Email: email,
      FirstName: firstName,
      LastName: lastName,
      Password: PasswordHash,
      TypeClientTip: typeClientTip || "Standard"
    });

    const { PasswordHash: _, ...safeClient } = client.dataValues;

    res.status(201).json({ client: safeClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   LOGIN CLIENT
   POST /api/auth/login
========================= */
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const client = await getClientByEmail(email);
    if (!client) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, client.Password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: client.ClientId, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const { PasswordHash, ...safeClient } = client.dataValues;

    res.status(200).json({
      token,
      client: safeClient
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default authRouter;
