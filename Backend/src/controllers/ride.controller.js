import { validationResult } from "express-validator";
import { Ride } from "../models/ride.model.js";
import { Driver } from "../models/driver.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a new ride request
// POST /api/v1/rides/create
// Private (Rider)
export const createRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { pickup, drop, fare, distance } = req.body;

    // Check if the rider already has an active request or ongoing ride
    const activeRide = await Ride.findOne({
        rider: req.user._id,
        status: { $in: ["requested", "accepted", "arriving", "started"] }
    });

    if (activeRide) {
        throw new ApiError(400, "You already have an active ride request or ongoing ride");
    }

    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const ride = await Ride.create({
        rider: req.user._id,
        pickup,
        drop,
        fare,
        distance,
        otp
    });

    // Explicitly attach the OTP in the response so the rider can share it with the driver
    const rideObj = ride.toObject();
    rideObj.otp = otp;

    return res.status(201).json(
        new ApiResponse(201, rideObj, "Ride requested successfully")
    );
});

// Get all requested rides available for drivers
// GET /api/v1/rides/available
// Private (Driver Only)
export const getAvailableRides = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    // Driver instance populated and verified by requireVerifiedDriver middleware
    if (req.driver.status !== "available") {
        throw new ApiError(400, "You must set your status to available to receive ride requests");
    }

    const rides = await Ride.find({
        status: "requested",
        driver: null
    }).populate("rider", "username fullname avatar");

    return res.status(200).json(
        new ApiResponse(
            200,
            rides,
            rides.length
                ? "Available rides fetched successfully"
                : "No rides available"
        )
    );
});

// Accept a ride request
// POST /api/v1/rides/:id/accept
// Private (Driver Only)
export const acceptRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    if (req.driver.status !== "available") {
        throw new ApiError(400, "You must be available to accept a ride");
    }

    // Verify driver does not already have an active ride assignment
    const activeRide = await Ride.findOne({
        driver: req.driver._id,
        status: { $in: ["accepted", "arriving", "started"] }
    });

    if (activeRide) {
        throw new ApiError(400, "You already have an active ride assignment");
    }

    const rideId = req.params.id;

    // Atomically lock driver status to busy to prevent concurrent accept requests
    const driver = await Driver.findOneAndUpdate(
        { _id: req.driver._id, status: "available" },
        { status: "busy" },
        { returnDocument: "after" }
    );

    if (!driver) {
        throw new ApiError(400, "You already have an active ride or are not available");
    }

    // Atomically find and update to prevent multiple drivers accepting the same ride
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, status: "requested", driver: null },
        {
            status: "accepted",
            driver: req.driver._id,
            acceptedAt: new Date()
        },
        { returnDocument: "after" }
    ).populate("rider", "username fullname avatar");

    if (!ride) {
        // Rollback driver status to available if ride was already accepted by someone else
        await Driver.findByIdAndUpdate(req.driver._id, { status: "available" });
        throw new ApiError(404, "Ride not found or already accepted by another driver");
    }

    // Keep req.driver status aligned in memory for current middleware pipeline
    req.driver.status = "busy";

    return res.status(200).json(
        new ApiResponse(200, ride, "Ride accepted successfully")
    );
});

// Update ride status to arriving (driver has arrived/is arriving at pickup)
// POST /api/v1/rides/:id/arriving
// Private (Driver Only)
export const arrivingRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const rideId = req.params.id;
    const ride = await Ride.findById(rideId).populate("rider", "username fullname avatar");

    if (!ride) {
        throw new ApiError(404, "Ride not found");
    }

    if (!ride.driver || ride.driver.toString() !== req.driver._id.toString()) {
        throw new ApiError(403, "You are not authorized for this ride");
    }

    if (ride.status !== "accepted") {
        throw new ApiError(400, `Cannot mark ride as arriving. Current status: ${ride.status}`);
    }

    ride.status = "arriving";
    ride.arrivedAt = new Date();
    await ride.save();

    return res.status(200).json(
        new ApiResponse(200, ride, "Driver is arriving at the pickup location")
    );
});

// Start the ride (requires OTP verification)
// POST /api/v1/rides/:id/start
// Private (Driver Only)
export const startRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { otp } = req.body;
    const rideId = req.params.id;

    // OTP is set with select: false, so we must fetch it explicitly
    const ride = await Ride.findById(rideId).select("+otp").populate("rider", "username fullname avatar");

    if (!ride) {
        throw new ApiError(404, "Ride not found");
    }

    if (!ride.driver || ride.driver.toString() !== req.driver._id.toString()) {
        throw new ApiError(403, "You are not authorized to start this ride");
    }

    if (ride.status !== "arriving") {
        throw new ApiError(400, `Cannot start a ride in status: ${ride.status}. Must be arriving first.`);
    }

    if (ride.otp !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    ride.status = "started";
    ride.otp = null; // Clear OTP once successfully verified and started
    ride.startedAt = new Date();
    await ride.save();
    const rideObj = ride.toObject();
    delete rideObj?.otp;
    return res.status(200).json(
        new ApiResponse(200, rideObj, "Ride started successfully")
    );
});

// Complete a ride
// POST /api/v1/rides/:id/complete
// Private (Driver Only)
export const completeRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const rideId = req.params.id;

    const ride = await Ride.findOneAndUpdate(
        {
            _id: rideId,
            driver: req.driver._id,
            status: "started"
        },
        {
            status: "completed",
            completedAt: new Date()
        },
        { returnDocument: "after" }
    ).populate("rider", "username fullname avatar");

    if (!ride) {
        throw new ApiError(400, "Ride not found, not started, or you are not authorized to complete it");
    }

    // Set driver status back to available
    req.driver.status = "available";
    await req.driver.save();

    return res.status(200).json(
        new ApiResponse(200, ride, "Ride completed successfully")
    );
});

// Cancel a ride (can be done by rider or driver under appropriate status)
// POST /api/v1/rides/:id/cancel
// Private (Rider or Driver)
export const cancelRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }
    const msgForCancel = "No reason mentioned";
    const { cancelReason } = req.body || {};
    const rideId = req.params.id;
    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new ApiError(404, "Ride not found");
    }

    if (req.user.role === "rider") {
        if (ride.rider.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to cancel this ride");
        }

        if (!["requested", "accepted", "arriving"].includes(ride.status)) {
            throw new ApiError(400, `Rides with status '${ride.status}' cannot be cancelled`);
        }

        // If a driver was assigned, free that driver back to available
        if (ride.driver) {
            await Driver.findByIdAndUpdate(ride.driver, { status: "available" });
        }

        ride.status = "cancelled";
        ride.cancelledBy = "rider";
        ride.cancelledAt = new Date();
        ride.cancelReason = cancelReason || msgForCancel;
        await ride.save();

        return res.status(200).json(
            new ApiResponse(200, ride, "Ride cancelled successfully by rider")
        );
    }

    if (req.user.role === "driver") {
        const driver = await Driver.findOne({ user: req.user._id });
        if (!driver) {
            throw new ApiError(404, "Driver profile not found");
        }

        if (!ride.driver || ride.driver.toString() !== driver._id.toString()) {
            throw new ApiError(403, "You are not assigned to this ride");
        }

        if (!["accepted", "arriving"].includes(ride.status)) {
            throw new ApiError(400, `Only accepted/arriving rides can be cancelled by the driver`);
        }

        // Mark the ride as cancelled
        ride.status = "requested";
        ride.driver = null;
        ride.cancelledBy = "driver";
        ride.cancelledAt = new Date();
        ride.cancelReason = cancelReason || msgForCancel;
        await ride.save();

        // Make the driver available again
        driver.status = "available";
        await driver.save();

        return res.status(200).json(
            new ApiResponse(200, ride, "Ride returned to available rides queue")
        );
    }

    throw new ApiError(403, "Unauthorized role");
});

// Get current active ride for user (rider or driver)
// GET /api/v1/rides/current
// Private (Rider or Driver)
export const getCurrentRide = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === "rider") {
        query = {
            rider: req.user._id,
            status: { $in: ["requested", "accepted", "arriving", "started"] }
        };
    } else if (req.user.role === "driver") {
        const driver = await Driver.findOne({ user: req.user._id });
        if (!driver) {
            throw new ApiError(404, "Driver profile not found");
        }
        query = {
            driver: driver._id,
            status: { $in: ["accepted", "arriving", "started"] }
        };
    } else {
        throw new ApiError(403, "Unauthorized role");
    }

    const ride = await Ride.findOne(query)
        .populate("rider", "username fullname avatar")
        .populate({
            path: "driver",
            populate: [
                { path: "user", select: "username fullname avatar" },
                { path: "vehicle" }
            ]
        });

    return res.status(200).json(
        new ApiResponse(200, ride, ride ? "Current active ride fetched successfully" : "No active ride found")
    );
});

// Get ride history for user (rider or driver)
// GET /api/v1/rides/history
// Private (Rider or Driver)
export const getRideHistory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.user.role === "rider") {
        query = { rider: req.user._id };
    } else if (req.user.role === "driver") {
        const driver = await Driver.findOne({ user: req.user._id });
        if (!driver) {
            throw new ApiError(404, "Driver profile not found");
        }
        query = { driver: driver._id };
    } else {
        throw new ApiError(403, "Unauthorized role");
    }

    const total = await Ride.countDocuments(query);
    const rides = await Ride.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("rider", "username fullname avatar")
        .populate({
            path: "driver",
            populate: [
                { path: "user", select: "username fullname avatar" },
                { path: "vehicle" }
            ]
        });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                rides,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            },
            "Ride history fetched successfully"
        )
    );
});
