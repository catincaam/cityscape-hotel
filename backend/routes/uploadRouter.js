import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const uploadRouter = express.Router();

const maxImageSizeMb = Number(process.env.UPLOAD_MAX_IMAGE_MB || 12);
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

export default uploadRouter;
