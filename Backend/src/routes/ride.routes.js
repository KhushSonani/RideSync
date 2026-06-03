import { Router } from "express";
import {
    createRide,
    getAvailableRides,
    acceptRide,
    arrivingRide,
    startRide,
    completeRide,
    cancelRide,
    getCurrentRide,
    getRideHistory
} from "../controllers/ride.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireDriver, requireRider } from "../middlewares/role.middleware.js";
import { requireVerifiedDriver } from "../middlewares/verify.middleware.js";
import {
    createRideValidator,
    startRideValidator,
    rideIdParamValidator,
    cancelRideValidator,
    getRideHistoryValidator
} from "../validators/ride.validator.js";

const router = Router();

// Create ride (Rider only)
router.post(
    "/create",
    verifyJWT,
    requireRider,
    createRideValidator,
    createRide
);

// Get available rides (Verified drivers only)
router.get(
    "/available",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    getAvailableRides
);

// Get current active ride (Rider or Driver)
router.get(
    "/current",
    verifyJWT,
    getCurrentRide
);

// Get ride history (Rider or Driver)
router.get(
    "/history",
    verifyJWT,
    getRideHistoryValidator,
    getRideHistory
);

// Accept a ride (Verified drivers only)
router.post(
    "/:id/accept",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    rideIdParamValidator,
    acceptRide
);

// Driver is arriving at pickup location (Verified drivers only)
router.post(
    "/:id/arriving",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    rideIdParamValidator,
    arrivingRide
);

// Start the ride (Verified drivers only)
router.post(
    "/:id/start",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    rideIdParamValidator,
    startRideValidator,
    startRide
);

// Complete the ride (Verified drivers only)
router.post(
    "/:id/complete",
    verifyJWT,
    requireDriver,
    requireVerifiedDriver,
    rideIdParamValidator,
    completeRide
);

// Cancel the ride (Rider or Driver)
router.post(
    "/:id/cancel",
    verifyJWT,
    cancelRideValidator,
    cancelRide
);

export default router;
