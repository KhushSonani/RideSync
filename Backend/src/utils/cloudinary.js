import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { config } from "../config/env.js";
import { ApiError } from "./ApiError.js";

// ─── Config ────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// ─── Folder map ────────────────────────────────────────────────────────────────
//  RideSync/
//  ├── users/avatar/
//  ├── drivers/license/
//  ├── drivers/vehicle/rc/
//  ├── drivers/vehicle/insurance/
//  ├── drivers/vehicle/puc/
//  ├── drivers/vehicle/permit/
//  └── drivers/vehicle/photo/
//
const FOLDER_MAP = {
  avatar: "RideSync/users/avatar",
  licenseFile: "RideSync/drivers/license",
  rcFile: "RideSync/drivers/vehicle/rc",
  insuranceFile: "RideSync/drivers/vehicle/insurance",
  pucFile: "RideSync/drivers/vehicle/puc",
  permitFile: "RideSync/drivers/vehicle/permit",
  vehiclePhoto: "RideSync/drivers/vehicle/photo",
};

const DEFAULT_FOLDER = "RideSync/misc";

// ─── Delete local temp file ────────────────────────────────────────────────────
const deleteTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ─── Upload to Cloudinary ──────────────────────────────────────────────────────
//
//  Usage in controller:
//    const result = await uploadToCloudinary(req.file.path, req.file.fieldname);
//    // result → { url: "https://res.cloudinary.com/...", public_id: "RideSync/..." }
//
//  On failure → returns null (don't crash the request, just handle gracefully).
//
export const uploadToCloudinary = async (localFilePath, fieldname = "") => {
  if (!localFilePath)
    throw new ApiError(400, "No file path provided for upload");

  const folder = FOLDER_MAP[fieldname] ?? DEFAULT_FOLDER;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: "auto",   // handles images + PDFs
      use_filename: true,
      unique_filename: true,
    });

    deleteTempFile(localFilePath);

    return {
      url: response.secure_url,
      public_id: response.public_id,
    };

  } catch (error) {
    deleteTempFile(localFilePath); // always clean up
    throw new ApiError(500, `Cloudinary upload failed [${fieldname}]: ${error.message}`);
  }
};

// ─── Delete from Cloudinary ────────────────────────────────────────────────────
//
//  Usage: await deleteFromCloudinary(driver.license.public_id);
//  Call this when a driver re-uploads a document (replace old file).
//
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Cloudinary delete failed [${publicId}]:`, error.message);
  }
};