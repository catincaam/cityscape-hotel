import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const uploadRouter = express.Router();

// Pentru a folosi __dirname în ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurare multer pentru upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Doar imagini sunt permise (jpeg, jpg, png, gif, webp)"));
  }
});

// Endpoint pentru upload de imagine (single)
uploadRouter.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nu a fost încărcată nicio imagine" });
    }

    // Returnăm URL-ul relativ al imaginii
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      message: "Imagine încărcată cu succes",
      imageUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la încărcarea imaginii" });
  }
});

// Endpoint pentru upload de imagini multiple
uploadRouter.post("/multiple", upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Nu au fost încărcate imagini" });
    }

    // Returnăm URL-urile relative ale imaginilor
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    console.log('✅ Multiple images uploaded:', imageUrls);
    res.status(200).json({
      message: `${imageUrls.length} imagini încărcate cu succes`,
      imageUrls
    });
  } catch (err) {
    console.error('❌ Error uploading multiple images:', err);
    res.status(500).json({ message: err.message || "Eroare la încărcarea imaginilor" });
  }
});

export default uploadRouter;
