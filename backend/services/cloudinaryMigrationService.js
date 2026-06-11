import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import Service from "../entities/Service.js";
import Reward from "../entities/Reward.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "cityscape-hotel";

export const hasCloudinaryConfig = Boolean(
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

export async function migrateLocalImagesToCloudinary() {
  if (!hasCloudinaryConfig) {
    return {
      skipped: true,
      reason: "Cloudinary is not configured",
      uploaded: [],
      updated: [],
      missing: []
    };
  }

  const cache = new Map();
  const report = {
    skipped: false,
    uploaded: [],
    updated: [],
    missing: []
  };

  await migrateModelField(RoomTheme, "showcaseImage", "RoomTheme", cache, report);
  await migrateModelField(RoomTheme, "image", "RoomTheme", cache, report);
  await migrateModelField(RoomImage, "imageUrl", "RoomImage", cache, report);
  await migrateModelField(Service, "image", "Service", cache, report);
  await migrateModelField(Reward, "image", "Reward", cache, report);

  return {
    ...report,
    uploadedCount: report.uploaded.length,
    updatedCount: report.updated.length,
    missingCount: report.missing.length
  };
}
