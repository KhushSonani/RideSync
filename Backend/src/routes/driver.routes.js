import { Router } from "express";
import {
    getDriverProfile,
    getDriverStatus,
    updateDriverStatus,
    uploadLicense,
    uploadVehicleDocs
} from "../controllers/driver.controller.js";
import { licenseUpload, vehicleDocsUpload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireDriver } from "../middlewares/role.middleware.js";
import { requireVerifiedDriver } from "../middlewares/verify.middleware.js";
const router = Router();

router.get(
    "/profile",
    verifyJWT,
    requireDriver,
    getDriverProfile
);

router.get(
    "/status",
    verifyJWT,
    requireDriver,
    getDriverStatus
);

router.put(
    "/status",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    updateDriverStatus
);

router.post(
    "/documents/license",
    verifyJWT,
    requireDriver,
    licenseUpload,
    uploadLicense
);

router.post(
    "/documents/vehicle",
    verifyJWT,
    requireDriver,
    vehicleDocsUpload,
    uploadVehicleDocs
);

export default router;