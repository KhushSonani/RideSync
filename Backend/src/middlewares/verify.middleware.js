import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Driver } from "../models/driver.model.js";

export const requireVerifiedDriver = asyncHandler(async (req, res, next) => {
    const driver = await Driver.findOne({ user: req.user._id })
        .populate("vehicle");

    if (!driver) {
        throw new ApiError(404, "Driver profile not found");
    }

    if (driver.driverVerified !== "verified") {
        throw new ApiError(
            403,
            driver.driverVerified === "rejected"
                ? `Account rejected — ${driver.verificationNote || "contact support"}`
                : "Account is pending admin verification"
        );
    }

    if (!driver.isActive) {
        throw new ApiError(
            403,
            "Account is inactive — one or more documents may have expired"
        );
    }

    if (!driver.vehicle) {
        throw new ApiError(404, "No vehicle linked to this driver");
    }

    if (driver.vehicle.vehicleVerified !== "verified") {
        throw new ApiError(403, "Vehicle is not verified yet");
    }

    const now = new Date();

    if (new Date(driver.vehicle.insurance.expiryDate) < now) {
        throw new ApiError(403, "Vehicle insurance has expired — please renew and re-upload");
    }

    if (new Date(driver.vehicle.puc.expiryDate) < now) {
        throw new ApiError(403, "PUC certificate has expired — please renew and re-upload");
    }

    if (new Date(driver.license.expiryDate) < now) {
        throw new ApiError(403, "Driving licence has expired — please renew and re-upload");
    }

    req.driver = driver;
    next();
});