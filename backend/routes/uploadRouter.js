import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const uploadRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
const maxImageSizeMb = Number(process.env.UPLOAD_MAX_IMAGE_MB || 12);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxImageSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error("Only image files are allowed: jpeg, jpg, png, gif, webp"));
  }
});

function handleUploadError(err, req, res, next) {
  if (!err) return next();

  console.error("Upload middleware error:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `Image is too large. Maximum size is ${maxImageSizeMb}MB per file.`
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected upload field. Use 'image' for one image or 'images' for multiple images."
      });
    }

    return res.status(400).json({ message: err.message || "Invalid image upload." });
  }

  return res.status(400).json({ message: err.message || "Image upload failed." });
}

function runUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => handleUploadError(err, req, res, next));
  };
}

uploadRouter.post("/", runUpload(upload.single("image")), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image was uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Image upload failed" });
  }
});

uploadRouter.post("/multiple", runUpload(upload.array("images", 10)), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images were uploaded" });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    res.status(200).json({
      message: `${imageUrls.length} images uploaded successfully`,
      imageUrls
    });
  } catch (err) {
    console.error("Error uploading multiple images:", err);
    res.status(500).json({ message: err.message || "Image upload failed" });
  }
});

export default uploadRouter;
