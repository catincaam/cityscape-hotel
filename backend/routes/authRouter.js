import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getClientByEmail, createClient } from "../dataAccess/ClientDA.js";

import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      TypeClientTip: typeClientTip || "Standard",
      profilePicture: "https://img.freepik.com/premium-vector/cute-frog-explorer-boy-vector-illustration_456699-1187.jpg?w=740"
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

/* =========================
   GOOGLE LOGIN
   POST /api/auth/google
========================= */
authRouter.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ message: "Invalid Google token" });

    // Find or create user
    let client = await getClientByEmail(payload.email);
    if (!client) {
      client = await createClient({
        Email: payload.email,
        FirstName: payload.given_name || "GoogleUser",
        LastName: payload.family_name || "",
        Password: "", // No password for OAuth
        TypeClientTip: "Google",
        profilePicture: "https://img.freepik.com/premium-vector/cute-frog-explorer-boy-vector-illustration_456699-1187.jpg?w=740"
      });
    }
    const { PasswordHash, ...safeClient } = client.dataValues || client;
    const jwtToken = jwt.sign(
      { id: client.ClientId, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.status(200).json({ token: jwtToken, client: safeClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Google login error" });
  }
});

/* =========================
   FACEBOOK LOGIN
   POST /api/auth/facebook
========================= */
authRouter.post("/facebook", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    // Verify Facebook token
    const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,first_name,last_name,email&access_token=${token}`);
    const fbData = await fbRes.json();
    if (!fbData.email) return res.status(400).json({ message: "Invalid Facebook token" });

    // Find or create user
    let client = await getClientByEmail(fbData.email);
    if (!client) {
      client = await createClient({
        Email: fbData.email,
        FirstName: fbData.first_name || "FacebookUser",
        LastName: fbData.last_name || "",
        Password: "", // No password for OAuth
        TypeClientTip: "Facebook",
        profilePicture: "https://img.freepik.com/premium-vector/cute-frog-explorer-boy-vector-illustration_456699-1187.jpg?w=740"
      });
    }
    const { PasswordHash, ...safeClient } = client.dataValues || client;
    const jwtToken = jwt.sign(
      { id: client.ClientId, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.status(200).json({ token: jwtToken, client: safeClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Facebook login error" });
  }
});
