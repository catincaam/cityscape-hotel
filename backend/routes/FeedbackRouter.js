// backend/routes/feedbackRouter.js
import express from "express";
import {
  createFeedback,
  getFeedbackById,
  getFeedbacks,
  updateFeedback,
  deleteFeedback
} from "../dataAccess/FeedbackDA.js";

const feedbackRouter = express.Router();

/* CREATE */
import { addPendingPoints } from '../dataAccess/RewardPointDA.js';
import Reservation from '../entities/Reservation.js';

feedbackRouter.post("/", async (req, res) => {
  try {
    const { ReservationId, ClientId } = req.body;
    console.log("[FEEDBACK] POST request:", { ReservationId, ClientId, body: req.body });
    
    if (!ReservationId || !ClientId) {
      console.log("[FEEDBACK] Missing required fields");
      return res.status(400).json({ message: "ReservationId and ClientId are required for feedback." });
    }
    
    // Verifică dacă rezervarea există și aparține clientului
    const reservation = await Reservation.findByPk(ReservationId);
    if (!reservation) {
      console.log("[FEEDBACK] Reservation not found:", ReservationId);
      return res.status(404).json({ message: "Reservation not found." });
    }
    
    if (reservation.ClientId !== ClientId) {
      console.log("[FEEDBACK] ClientId mismatch:", { reservationClientId: reservation.ClientId, providedClientId: ClientId });
      return res.status(403).json({ message: "You can only leave feedback for your own reservation." });
    }
    
    // Permite feedback doar dacă statusul e 'completed' sau 'paid'
    if (reservation.status !== 'completed' && reservation.status !== 'paid') {
      console.log("[FEEDBACK] Invalid reservation status:", reservation.status);
      return res.status(400).json({ message: "Feedback is allowed only after the stay is completed or paid." });
    }
    
    // Add submissionDate to feedback data
    const feedbackData = {
      ...req.body,
      submissionDate: new Date()
    };
    
    const feedback = await createFeedback(feedbackData);
    console.log("[FEEDBACK] Feedback created:", feedback);
    
    // Award points only if not already awarded for this reservation
    const existing = await Reservation.sequelize.models.RewardPoint.findOne({
      where: { ReservationId: ReservationId, UserId: ClientId }
    });
    if (!existing) {
      await addPendingPoints({
        userId: ClientId,
        reservationId: ReservationId,
        amount: 500,
        description: 'Feedback review reward',
        availableAt: new Date()
      });
      console.log("[FEEDBACK] Points awarded");
    }
    res.status(201).json(feedback);
  } catch (err) {
    console.error("[FEEDBACK] Error:", err.message, err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

/* READ all */
feedbackRouter.get("/", async (req, res) => {
  try {
    const list = await getFeedbacks();
    res.status(200).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
feedbackRouter.get("/:id", async (req, res) => {
  try {
    const feedback = await getFeedbackById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "not found" });
    res.status(200).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
feedbackRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateFeedback(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
feedbackRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteFeedback(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default feedbackRouter;
