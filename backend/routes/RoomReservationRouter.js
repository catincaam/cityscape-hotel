// backend/routes/roomReservationRouter.js
import express from "express";
import {
  createRoomReservation,
  getRoomReservation,
  getRoomReservations,
  deleteRoomReservation
} from "../dataAccess/RoomReservationDA.js";

const roomReservationRouter = express.Router();

/* CREATE */
roomReservationRouter.post("/", async (req, res) => {
  try {
    const rr = await createRoomReservation(req.body);
    res.status(201).json(rr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
roomReservationRouter.get("/", async (req, res) => {
  try {
    const rrs = await getRoomReservations();
    res.status(200).json(rrs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by reservationId + roomId */
roomReservationRouter.get("/:reservationId/:roomId", async (req, res) => {
  try {
    const rr = await getRoomReservation(req.params.reservationId, req.params.roomId);
    if (!rr) return res.status(404).json({ message: "not found" });
    res.status(200).json(rr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
roomReservationRouter.delete("/:reservationId/:roomId", async (req, res) => {
  try {
    const deleted = await deleteRoomReservation(req.params.reservationId, req.params.roomId);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default roomReservationRouter;
