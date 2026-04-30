import express from "express";
import {
  createRoom,
  getRoomById,
  getRooms,
  updateRoom,
  deleteRoom,
  getAvailableRooms
} from "../dataAccess/RoomDA.js";
import { isPositiveInteger, isValidDateRange } from "../utils/validators.js";

const roomRouter = express.Router();

/* CREATE */
roomRouter.post("/", async (req, res) => {
  try {
    const room = await createRoom(req.body);
    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
roomRouter.get("/", async (req, res) => {
  try {
    const rooms = await getRooms();
    res.status(200).json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* ⭐ AVAILABLE ROOMS SEARCH ⭐ */
roomRouter.get("/available/search", async (req, res) => {
  try {
    const { checkIn, checkOut, adults, children } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: "Missing check-in or check-out" });
    }

    const guests = Number(adults || 0) + Number(children || 0);
    if (!isValidDateRange(checkIn, checkOut)) {
      return res.status(400).json({ message: "Check-in must be before check-out." });
    }

    if (!isPositiveInteger(guests)) {
      return res.status(400).json({ message: "Guests must be a positive number." });
    }

    const rooms = await getAvailableRooms({
      checkIn,
      checkOut,
      guests
    });

    res.status(200).json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
roomRouter.get("/:id", async (req, res) => {
  try {
    const room = await getRoomById(req.params.id);
    if (!room) return res.status(404).json({ message: "not found" });
    res.status(200).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
roomRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateRoom(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
roomRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteRoom(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default roomRouter;
