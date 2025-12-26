// backend/routes/hotelRouter.js
import express from "express";
import {
  createHotel,
  getHotelById,
  getHotels,
  updateHotel,
  deleteHotel
} from "../dataAccess/HotelDA.js";

const hotelRouter = express.Router();

/* CREATE */
hotelRouter.post("/", async (req, res) => {
  try {
    const hotel = await createHotel(req.body);
    res.status(201).json(hotel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
hotelRouter.get("/", async (req, res) => {
  try {
    const hotels = await getHotels();
    res.status(200).json(hotels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
hotelRouter.get("/:id", async (req, res) => {
  try {
    const hotel = await getHotelById(req.params.id);
    if (!hotel) return res.status(404).json({ message: "not found" });
    res.status(200).json(hotel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
hotelRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateHotel(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
hotelRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteHotel(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default hotelRouter;
