import express from "express";
import db from "../dbConfig.js"; // conexiunea ta la MySQL
import DB_Init from "../entities/DB_Init.js"; // funcția ta de inițializare tabele

const createDbRouter = express.Router();

/* GET /api/db/create - sincronizează baza de date */
createDbRouter.route("/create").get(async (req, res) => {
  try {
    // folosește funcția de inițializare care face setup FK și sync
    await DB_Init();

    res.status(200).json({ message: "Database synced (development mode)" });
  } catch (err) {
    console.error("DB creation error:", err.stack);
    res.status(500).json({ message: "Server error during DB creation" });
  }
});

export default createDbRouter;
