// backend/routes/reservationRouter.js
import express from "express";
import {
  createReservation,
  getReservationById,
  getReservations,
  updateReservation,
  deleteReservation
} from "../dataAccess/ReservationDA.js";

const reservationRouter = express.Router();

/* CREATE */
reservationRouter.post("/", async (req, res) => {
  try {
    const reservation = await createReservation(req.body);
    res.status(201).json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
reservationRouter.get("/", async (req, res) => {
  try {
    const reservations = await getReservations();
    res.status(200).json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
reservationRouter.get("/:id", async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "not found" });
    res.status(200).json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
reservationRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateReservation(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
reservationRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteReservation(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default reservationRouter;
