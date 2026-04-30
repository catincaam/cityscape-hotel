import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../entities/Admin.js";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password.trim(), admin.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: admin.AdminId, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.status(200).json({
      token,
      admin: { email: admin.email, name: admin.name, AdminId: admin.AdminId }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default adminAuthRouter;
