import express from "express";
import {
  addPendingPoints,
  activatePointsForReservation,
  getUserPoints,
  getUserActivePoints,
  getUserPendingPoints
} from "../dataAccess/RewardPointDA.js";

const router = express.Router();

router.post("/pending", async (req, res) => {
  try {
    const { userId, reservationId, amount, description, availableAt } = req.body;
    const reward = await addPendingPoints({ userId, reservationId, amount, description, availableAt });
    res.status(201).json(reward);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.post("/activate", async (req, res) => {
  try {
    const { reservationId } = req.body;
    await activatePointsForReservation(reservationId);
    res.status(200).json({ message: "Points activated" });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const points = await getUserPoints(req.params.userId);
    res.status(200).json(points);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.get("/user/:userId/active", async (req, res) => {
  try {
    const sum = await getUserActivePoints(req.params.userId);
    res.status(200).json({ activePoints: sum });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.get("/user/:userId/pending", async (req, res) => {
  try {
    const sum = await getUserPendingPoints(req.params.userId);
    res.status(200).json({ pendingPoints: sum });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
