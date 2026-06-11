import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import Service from "../entities/Service.js";
import Reward from "../entities/Reward.js";

const uploadRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
const maxImageSizeMb = Number(process.env.UPLOAD_MAX_IMAGE_MB || 25);
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "cityscape-hotel";

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_URL ||
  (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
);

if (hasCloudinaryConfig && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

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

function isLocalUploadUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function localUploadPath(value) {
  const filename = path.basename(value);
  return path.join(uploadDir, filename);
}

async function migrateLocalUpload(value, cache, report) {
  if (!isLocalUploadUrl(value)) return value;
  if (cache.has(value)) return cache.get(value);

  const filePath = localUploadPath(value);
  if (!fs.existsSync(filePath)) {
    report.missing.push(value);
    cache.set(value, value);
    return value;
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: cloudinaryFolder,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false
  });

  cache.set(value, result.secure_url);
  report.uploaded.push({ from: value, to: result.secure_url });
  return result.secure_url;
}

async function migrateModelField(Model, field, label, cache, report) {
  const rows = await Model.findAll();
  for (const row of rows) {
    const currentValue = row[field];
    if (!isLocalUploadUrl(currentValue)) continue;

    const migratedValue = await migrateLocalUpload(currentValue, cache, report);
    if (migratedValue !== currentValue) {
      row[field] = migratedValue;
      await row.save();
      report.updated.push({ type: label, id: row[Model.primaryKeyAttribute], field });
    }
  }
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

    const cache = new Map();
    const report = {
      uploaded: [],
      updated: [],
      missing: []
    };

    await migrateModelField(RoomTheme, "showcaseImage", "RoomTheme", cache, report);
    await migrateModelField(RoomTheme, "image", "RoomTheme", cache, report);
    await migrateModelField(RoomImage, "imageUrl", "RoomImage", cache, report);
    await migrateModelField(Service, "image", "Service", cache, report);
    await migrateModelField(Reward, "image", "Reward", cache, report);

    res.status(200).json({
      message: "Local upload image migration completed",
      uploadedCount: report.uploaded.length,
      updatedCount: report.updated.length,
      missingCount: report.missing.length,
      ...report
    });
  } catch (err) {
    console.error("Cloudinary migration failed:", err);
    res.status(500).json({ message: err.message || "Cloudinary migration failed" });
  }
});

export default uploadRouter;
