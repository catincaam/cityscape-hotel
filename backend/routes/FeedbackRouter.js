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
feedbackRouter.post("/", async (req, res) => {
  try {
    const feedback = await createFeedback(req.body);
    res.status(201).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
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
