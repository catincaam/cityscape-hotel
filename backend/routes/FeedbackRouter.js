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
import RewardPoint from "../entities/RewardPoint.js";
import { isValidRating } from "../utils/validators.js";

function canLeaveFeedback(reservation) {
  if (!reservation) return false;

  const status = String(reservation.status || "").trim().toLowerCase();
  if (["completed", "past"].includes(status)) return true;

  if (["paid", "partial", "active"].includes(status) && reservation.requestedCheckout) {
    return new Date(reservation.requestedCheckout) < new Date();
  }

  return false;
}

feedbackRouter.post("/", async (req, res) => {
  try {
    const { ReservationId, ClientId, overall, cleanliness, service, theme, comment } = req.body;
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
    
    if (String(reservation.ClientId) !== String(ClientId)) {
      console.log("[FEEDBACK] ClientId mismatch:", { reservationClientId: reservation.ClientId, providedClientId: ClientId });
      return res.status(403).json({ message: "You can only leave feedback for your own reservation." });
    }
    
    // Permite feedback doar dacă statusul e 'completed' sau 'paid'
    if (!canLeaveFeedback(reservation)) {
      console.log("[FEEDBACK] Invalid reservation status:", reservation.status);
      return res.status(400).json({ message: "Feedback is allowed only after the stay is completed." });
    }

    if (![overall, cleanliness, service, theme].every(isValidRating)) {
      return res.status(400).json({ message: "All ratings must be between 1 and 5." });
    }

    const normalizedComment = String(comment || "").trim();
    if (normalizedComment.length < 10 || normalizedComment.length > 500) {
      return res.status(400).json({ message: "Comment must be between 10 and 500 characters." });
    }
    
    // Add submissionDate to feedback data
    const feedbackData = {
      ...req.body,
      comment: normalizedComment,
      submissionDate: new Date()
    };
    
    const feedback = await createFeedback(feedbackData);
    console.log("[FEEDBACK] Feedback created:", feedback);
    
    // Award points only if not already awarded for this reservation
    const existing = await RewardPoint.findOne({
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
