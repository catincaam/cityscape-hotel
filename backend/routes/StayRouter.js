// backend/routes/stayRouter.js
import express from "express";
import {
  createStay,
  getStayById,
  getStays,
  updateStay,
  deleteStay
} from "../dataAccess/StayDA.js";

const stayRouter = express.Router();

/* CREATE */
stayRouter.post("/", async (req, res) => {
  try {
    const stay = await createStay(req.body);
    res.status(201).json(stay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
stayRouter.get("/", async (req, res) => {
  try {
    const stays = await getStays();
    res.status(200).json(stays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
stayRouter.get("/:id", async (req, res) => {
  try {
    const stay = await getStayById(req.params.id);
    if (!stay) return res.status(404).json({ message: "not found" });
    res.status(200).json(stay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
stayRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateStay(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
stayRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteStay(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default stayRouter;
