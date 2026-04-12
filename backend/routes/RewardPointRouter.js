import express from "express";
import RewardPoint from "../entities/RewardPoint.js";
import {
  addPendingPoints,
  activatePointsForReservation,
  getUserPoints,
  getUserActivePoints,
  getUserPendingPoints
} from "../dataAccess/RewardPointDA.js";

const router = express.Router();

// Adaugă puncte pending la plată
router.post("/pending", async (req, res) => {
  try {
    const { userId, reservationId, amount, description, availableAt } = req.body;
    const reward = await addPendingPoints({ userId, reservationId, amount, description, availableAt });
    res.status(201).json(reward);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

// Activează punctele la checkout
router.post("/activate", async (req, res) => {
  try {
    const { reservationId } = req.body;
    await activatePointsForReservation(reservationId);
    res.status(200).json({ message: "Points activated" });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

// Obține toate punctele userului
router.get("/user/:userId", async (req, res) => {
  try {
    const points = await getUserPoints(req.params.userId);
    res.status(200).json(points);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

// Obține suma punctelor active
router.get("/user/:userId/active", async (req, res) => {
  try {
    const sum = await getUserActivePoints(req.params.userId);
    res.status(200).json({ activePoints: sum });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

// Obține suma punctelor pending
router.get("/user/:userId/pending", async (req, res) => {
  try {
    const sum = await getUserPendingPoints(req.params.userId);
    res.status(200).json({ pendingPoints: sum });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

// POST - Add test points (dev only)
router.post("/test-add/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount = 5000 } = req.body;

    const points = await RewardPoint.create({
      UserId: parseInt(userId),
      amount: parseInt(amount),
      description: 'Test points - dev only',
      status: 'active',
      availableAt: new Date()
    });

    console.log(`✅ Test points added: ${amount}p for user ${userId}`);
    res.json({ message: "Test points added", points });
  } catch (err) {
    console.error("Error adding test points:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

export default router;
