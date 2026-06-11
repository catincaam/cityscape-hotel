import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import { hasCloudinaryConfig, migrateLocalImagesToCloudinary } from "../services/cloudinaryMigrationService.js";

const uploadRouter = express.Router();

const maxImageSizeMb = Number(process.env.UPLOAD_MAX_IMAGE_MB || 25);
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "cityscape-hotel";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
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

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const [type, token] = String(authHeader || "").split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing admin token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid admin token" });
  }
}

function ensureCloudinaryConfigured(res) {
  if (hasCloudinaryConfig) return true;

  res.status(500).json({
    message: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
  });
  return false;
}

function uploadBufferToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

uploadRouter.post("/", runUpload(upload.single("image")), async (req, res) => {
  try {
    if (!ensureCloudinaryConfigured(res)) return;

    if (!req.file) {
      return res.status(400).json({ message: "No image was uploaded" });
    }

    const result = await uploadBufferToCloudinary(req.file);
    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: result.secure_url
    });
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    res.status(500).json({ message: err.message || "Image upload failed" });
  }
});

uploadRouter.post("/multiple", runUpload(upload.array("images", 10)), async (req, res) => {
  try {
    if (!ensureCloudinaryConfigured(res)) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images were uploaded" });
    }

    const results = await Promise.all(req.files.map(uploadBufferToCloudinary));
    const imageUrls = results.map(result => result.secure_url);
    res.status(200).json({
      message: `${imageUrls.length} images uploaded successfully`,
      imageUrls
    });
  } catch (err) {
    console.error("Error uploading multiple images:", err);
    res.status(500).json({ message: err.message || "Image upload failed" });
  }
});

uploadRouter.post("/migrate-local-images", requireAdmin, async (req, res) => {
  try {
    if (!ensureCloudinaryConfigured(res)) return;

    const report = await migrateLocalImagesToCloudinary();

    res.status(200).json({
      message: "Local upload image migration completed",
      ...report
    });
  } catch (err) {
    console.error("Cloudinary migration failed:", err);
    res.status(500).json({ message: err.message || "Cloudinary migration failed" });
  }
});

export default uploadRouter;
