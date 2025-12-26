// backend/routes/staffRouter.js
import express from "express";
import {
  createStaff,
  getStaffById,
  getStaffs,
  updateStaff,
  deleteStaff
} from "../dataAccess/StaffDA.js";

const staffRouter = express.Router();

/* CREATE */
staffRouter.post("/", async (req, res) => {
  try {
    const staff = await createStaff(req.body);
    res.status(201).json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all */
staffRouter.get("/", async (req, res) => {
  try {
    const staffs = await getStaffs();
    res.status(200).json(staffs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
staffRouter.get("/:id", async (req, res) => {
  try {
    const staff = await getStaffById(req.params.id);
    if (!staff) return res.status(404).json({ message: "not found" });
    res.status(200).json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
staffRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateStaff(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
staffRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteStaff(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default staffRouter;
