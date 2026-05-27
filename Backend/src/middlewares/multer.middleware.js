import multer from "multer";
import path from "path";
import os from "os";

// ─── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const storage = multer.diskStorage({
  destination: os.tmpdir(),
 
  filename: (req, file, cb) => {
    // fieldname-timestamp.ext  — no req.user here, it's not populated yet
    // e.g. licenseFile-1715000000000.pdf
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

// ─── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: JPEG, PNG, WEBP, PDF.`), false);
  }
};

// ─── Base instance ─────────────────────────────────────────────────────────────
const baseUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── Named middlewares (match your route field names) ─────────────────────────
//
//  router.post("/documents/license", authUser, requireDriver, licenseUpload,     uploadLicense);
//  router.post("/documents/vehicle", authUser, requireDriver, vehicleDocsUpload, uploadVehicleDocs);
//  router.put("/profile",            authUser,                profilePhotoUpload, updateProfile);
//

export const profilePhotoUpload = baseUpload.single("avatar");
export const licenseUpload      = baseUpload.single("licenseFile");
export const vehicleDocsUpload  = baseUpload.fields([
  { name: "rcFile",        maxCount: 1 },
  { name: "insuranceFile", maxCount: 1 },
  { name: "pucFile",       maxCount: 1 },
  { name: "permitFile",    maxCount: 1 },
  { name: "vehiclePhoto",  maxCount: 1 },
]);

// ─── Error handler ─────────────────────────────────────────────────────────────
//  Mount once in app.js after all routes:  app.use(multerErrorHandler)
export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:       "File too large. Max size is 5MB.",
      LIMIT_UNEXPECTED_FILE: `Unexpected field "${err.field}".`,
      LIMIT_FILE_COUNT:      "Too many files.",
    };
    return res.status(400).json({ success: false, message: messages[err.code] ?? err.message });
  }
  if (err && err.message && err.message.startsWith("Invalid file type")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};