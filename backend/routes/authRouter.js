import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getClientByEmail, createClient } from "../dataAccess/ClientDA.js";
import Client from "../entities/Client.js";
import PasswordResetToken from "../entities/PasswordResetToken.js";
import { sendAccountCreatedEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { ensureClientTypes } from "../services/clientTierService.js";
import {
  isStrongPassword,
  isValidEmail,
  isValidPersonName,
  normalizeEmail
} from "../utils/validators.js";

import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authRouter = express.Router();
const DEFAULT_PROFILE_PICTURE = "/assets/profilePicture.jpg";

const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/* =========================
   REGISTER CLIENT
   POST /api/auth/register
========================= */
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, typeClientTip } = req.body;
    const normalizedEmail = normalizeEmail(email);
    await ensureClientTypes();

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Email, password, first and last name required" });
    }

    if (!isValidPersonName(firstName) || !isValidPersonName(lastName)) {
      return res.status(400).json({ message: "Names must have at least 3 letters and cannot contain numbers or special symbols." });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must have at least 8 characters, one uppercase letter and one number." });
    }

    const existing = await getClientByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: "Client already exists" });
    }

    const PasswordHash = await bcrypt.hash(password, 10);

    const client = await createClient({
      Email: normalizedEmail,
      FirstName: firstName.trim(),
      LastName: lastName.trim(),
      Password: PasswordHash,
      TypeClientTip: typeClientTip || "Standard",
      profilePicture: DEFAULT_PROFILE_PICTURE
    });

    const { Password: _, ...safeClient } = client.dataValues;

    const emailResult = await sendAccountCreatedEmail({ client });
    if (!emailResult.success) {
      console.warn("[ACCOUNT CREATED EMAIL] Not sent:", emailResult.error);
    }

    res.status(201).json({
      client: safeClient,
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      }
    });
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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const client = await getClientByEmail(normalizedEmail);
    if (!client) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!client.Password) {
      return res.status(401).json({ message: "This account uses Google sign-in. Please continue with Google." });
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

    const { Password, ...safeClient } = client.dataValues;

    res.status(200).json({
      token,
      client: safeClient
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   REQUEST PASSWORD RESET
   POST /api/auth/forgot-password
========================= */
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const client = await getClientByEmail(email);
    const genericMessage = "If an account exists for this email, a reset link has been sent.";

    if (!client) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.update(
      { usedAt: new Date() },
      {
        where: {
          ClientId: client.ClientId,
          usedAt: null
        }
      }
    );

    await PasswordResetToken.create({
      ClientId: client.ClientId,
      tokenHash,
      expiresAt
    });

    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    const emailResult = await sendPasswordResetEmail({
      client,
      resetUrl,
      expiresInMinutes: 60
    });

    if (!emailResult.success) {
      console.warn("[PASSWORD RESET EMAIL] Not sent:", emailResult.error);
      return res.status(500).json({ message: "Could not send reset email. Please try again later." });
    }

    return res.status(200).json({ message: genericMessage });
  } catch (err) {
    console.error("[FORGOT PASSWORD ERROR]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   RESET PASSWORD
   POST /api/auth/reset-password
========================= */
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must have at least 8 characters, one uppercase letter and one number." });
    }

    const tokenHash = hashResetToken(token);
    const resetRecord = await PasswordResetToken.findOne({
      where: {
        tokenHash,
        usedAt: null
      }
    });

    if (!resetRecord || new Date(resetRecord.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Reset link is invalid or expired" });
    }

    const client = await Client.findByPk(resetRecord.ClientId);
    if (!client) {
      return res.status(400).json({ message: "Reset link is invalid or expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await client.update({
      Password: hashedPassword,
      TypeClientTip: client.TypeClientTip === "Google" || client.TypeClientTip === "Facebook"
        ? "Standard"
        : client.TypeClientTip
    });
    await resetRecord.update({ usedAt: new Date() });

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    res.status(500).json({ message: "Server error" });
  }
});

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
      await ensureClientTypes();
      client = await createClient({
        Email: payload.email,
        FirstName: payload.given_name || "GoogleUser",
        LastName: payload.family_name || "",
        Password: "", // No password for OAuth
        TypeClientTip: "Standard",
        profilePicture: DEFAULT_PROFILE_PICTURE
      });
    }
    const { Password, ...safeClient } = client.dataValues || client;
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
      await ensureClientTypes();
      client = await createClient({
        Email: fbData.email,
        FirstName: fbData.first_name || "FacebookUser",
        LastName: fbData.last_name || "",
        Password: "", // No password for OAuth
        TypeClientTip: "Standard",
        profilePicture: DEFAULT_PROFILE_PICTURE
      });
    }
    const { Password, ...safeClient } = client.dataValues || client;
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

export default authRouter;
