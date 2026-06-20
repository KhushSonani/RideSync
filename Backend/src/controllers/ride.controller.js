import { randomInt } from "crypto";
import { validationResult } from "express-validator";
import { Ride } from "../models/ride.model.js";
import { Driver } from "../models/driver.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getIO, joinRideRoom, leaveRideRoom, joinRequestRoom, dissolveRequestRoom } from "../Socket/socket.js";
import { SOCKET_EVENTS } from "../Socket/socket.events.js";
import { config } from "../config/env.js";
import { findNearbyAvailableDrivers } from "../utils/dispatch.js";
import {
    sendNewRideRequest,
    sendRideAccepted,
    sendDriverArriving,
    sendRideStarted,
    sendRideCompleted,
    sendRideCancelled,
} from "../services/notification.service.js";

// ─── Create a new ride request ───────────────────────────────────────────────
// POST /api/v1/rides/create
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
    const otp = randomInt(100000, 1000000).toString();

    const ride = await Ride.create({
        rider: req.user._id,
        pickup,
        drop,
        fare,
        distance,
        otp
    });

    // Populate rider for the socket payload
    await ride.populate("rider", "username fullname avatar");

    // Explicitly attach the OTP in the response so the rider can share it with the driver
    const rideObj = ride.toObject();
    rideObj.otp = otp;

    // ── Geo-targeted dispatch ─────────────────────────────────────────────────
    // Find all verified, active, available drivers within the configured radius.
    // We use the existing 2dsphere index on Driver.location for this query.
    // The result is an array of { _id (driverId), user (userId) } objects.
    const nearbyDrivers = await findNearbyAvailableDrivers(pickup.location.coordinates);

    const rideIdStr = ride._id.toString();

    if (nearbyDrivers.length > 0) {
        const dispatchObj = { ...rideObj };
        delete dispatchObj.otp; // Do not leak OTP to drivers

        for (const driver of nearbyDrivers) {
            const driverUserId = driver.user.toString();
            // Emit only to this specific driver's personal room
            getIO().to(`user:${driverUserId}`).emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, dispatchObj);
            // Stage this driver in the request room so we can dissolve it later
            joinRequestRoom(driverUserId, rideIdStr);
            // Push notification — fire-and-forget; failure never breaks ride creation
            sendNewRideRequest(driverUserId, dispatchObj);
        }
        console.log(
            `[Dispatch] Ride ${rideIdStr} sent to ${nearbyDrivers.length} nearby driver(s)`
        );
    } else {
        // No nearby drivers online — ride is still created and visible via
        // GET /rides/available for drivers who come online later.
        console.log(`[Dispatch] Ride ${rideIdStr}: no nearby drivers online within ${config.DISPATCH_RADIUS_KM}km`);
    }

    const responseMessage = nearbyDrivers.length > 0
        ? "Ride requested successfully"
        : "Searching for drivers";

    return res.status(201).json(
        new ApiResponse(201, rideObj, responseMessage)
    );
});

// ─── Get all requested rides available for drivers ───────────────────────────
// GET /api/v1/rides/available
export const getAvailableRides = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    // Driver instance populated and verified by requireVerifiedDriver middleware
    if (req.driver.status !== "available") {
        throw new ApiError(400, "You must set your status to available to receive ride requests");
    }

    // MED-7: guard against missing GPS coordinates (driver has never emitted location)
    if (!req.driver.location?.coordinates?.length) {
        return res.status(200).json(
            new ApiResponse(200, [], "Enable GPS and share your location to see nearby rides")
        );
    }

    const rides = await Ride.find({
        status: "requested",
        driver: null,
        "pickup.location": {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: req.driver.location.coordinates
                },
                $maxDistance: config.DISPATCH_RADIUS_KM * 1000
            }
        }
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

// ─── Accept a ride request ───────────────────────────────────────────────────
// POST /api/v1/rides/:id/accept
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
    ).populate("user", "username fullname avatar").populate("vehicle");

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

    const riderId = ride.rider._id.toString();
    const driverUserId = req.user._id.toString();
    const rideIdStr = ride._id.toString();

    // ── Room management ──────────────────────────────────────────────────────
    // Move both the rider's and driver's sockets into the ride-specific room.
    // From this point on, all in-ride events are emitted to ride:{rideId}.
    joinRideRoom(riderId, rideIdStr);
    joinRideRoom(driverUserId, rideIdStr);

    // Driver should no longer receive new ride requests
    getIO().in(`user:${driverUserId}`).socketsLeave("drivers:available");

    // Notify all OTHER drivers who received this request that it is gone.
    // dissolveRequestRoom emits RIDE_UNAVAILABLE to the ride-request:{id} room
    // (which includes the accepting driver too — their UI handles dismissal)
    // then forces everyone out of the room, cleaning it up completely.
    dissolveRequestRoom(rideIdStr);

    // CRIT-2: Emit RIDE_ACCEPTED to both the ride room AND the rider's personal
    // user room. If the rider is backgrounded, their socket may not have joined
    // ride:{rideId} yet (socketsJoin is async). Emitting to user:{riderId} ensures
    // the event reaches the rider's socket regardless of room-join timing.
    const rideAcceptedPayload = {
        ride,
        driver: {
            _id: driver._id,
            user: driver.user,
            vehicle: driver.vehicle,
            status: driver.status,
        },
    };
    getIO().to(`ride:${rideIdStr}`).to(`user:${riderId}`).emit(SOCKET_EVENTS.RIDE_ACCEPTED, rideAcceptedPayload);

    // Push notification to rider — fire-and-forget
    sendRideAccepted(riderId, ride, driver);

    return res.status(200).json(
        new ApiResponse(200, ride, "Ride accepted successfully")
    );
});

// ─── Update ride status to arriving ─────────────────────────────────────────
// POST /api/v1/rides/:id/arriving
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

    // Emit to the ride room — both rider and driver are already members
    getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATED, {
        _id: ride._id,
        status: ride.status,
        arrivedAt: ride.arrivedAt,
    });

    // Push notification to rider — fire-and-forget
    const riderIdStr = ride.rider._id?.toString() ?? ride.rider.toString();
    sendDriverArriving(riderIdStr, ride);

    return res.status(200).json(
        new ApiResponse(200, ride, "Driver is arriving at the pickup location")
    );
});

// ─── Start the ride (requires OTP verification) ──────────────────────────────
// POST /api/v1/rides/:id/start
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

    // Emit to the ride room
    getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATED, {
        _id: rideObj._id,
        status: rideObj.status,
        startedAt: rideObj.startedAt,
    });

    // Push notification to rider — fire-and-forget
    const riderIdForStart = ride.rider._id?.toString() ?? ride.rider.toString();
    sendRideStarted(riderIdForStart, rideObj);

    return res.status(200).json(
        new ApiResponse(200, rideObj, "Ride started successfully")
    );
});

// ─── Complete a ride ─────────────────────────────────────────────────────────
// POST /api/v1/rides/:id/complete
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

    // MED-5: Use a targeted update instead of req.driver.save() to avoid
    // overwriting concurrent changes to the driver document.
    await Driver.findByIdAndUpdate(req.driver._id, { status: "available" });
    req.driver.status = "available"; // keep in-memory copy aligned

    const riderId = ride.rider._id.toString();
    const driverUserId = req.user._id.toString();

    // Notify everyone in the ride room
    getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_COMPLETED, {
        _id: ride._id,
        status: ride.status,
        completedAt: ride.completedAt,
        fare: ride.fare,
    });

    // Push notification to rider — fire-and-forget
    sendRideCompleted(riderId, ride);

    // ── Room cleanup ─────────────────────────────────────────────────────────
    leaveRideRoom(riderId, rideId);
    leaveRideRoom(driverUserId, rideId);

    // Driver is available again — rejoin the available pool
    getIO().in(`user:${driverUserId}`).socketsJoin("drivers:available");

    return res.status(200).json(
        new ApiResponse(200, ride, "Ride completed successfully")
    );
});

// ─── Cancel a ride ───────────────────────────────────────────────────────────
// POST /api/v1/rides/:id/cancel
export const cancelRide = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const defaultCancelMsg = "No reason mentioned";
    const { cancelReason } = req.body || {};
    const rideId = req.params.id;
    const ride = await Ride.findById(rideId);

    if (!ride) {
        throw new ApiError(404, "Ride not found");
    }

    // ── Rider cancellation ───────────────────────────────────────────────────
    if (req.user.role === "rider") {
        if (ride.rider.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to cancel this ride");
        }

        if (!["requested", "accepted", "arriving"].includes(ride.status)) {
            throw new ApiError(400, `Rides with status '${ride.status}' cannot be cancelled`);
        }

        const updatedRide = await Ride.findOneAndUpdate(
            { _id: rideId, status: { $in: ["requested", "accepted", "arriving"] } },
            {
                $set: {
                    status: "cancelled",
                    cancelledBy: "rider",
                    cancelledAt: new Date(),
                    cancelReason: cancelReason || defaultCancelMsg
                }
            },
            { new: true }
        );

        if (!updatedRide) {
            throw new ApiError(400, "Ride state changed before cancellation could complete.");
        }

        const hadDriver = !!updatedRide.driver;
        const assignedDriverId = updatedRide.driver?.toString() ?? null;
        let assignedDriverDoc = null;

        // If a driver was assigned, free that driver back to available
        if (hadDriver) {
            assignedDriverDoc = await Driver.findByIdAndUpdate(assignedDriverId, { status: "available" }).select("user").lean();

            // Find the driver's user ID to manage their room memberships
            if (assignedDriverDoc) {
                const driverUserId = assignedDriverDoc.user.toString();
                // Driver is available again → put them back in the available pool
                getIO().in(`user:${driverUserId}`).socketsJoin("drivers:available");
            }
        }

        const riderId = req.user._id.toString();
        const cancelPayload = {
            _id: updatedRide._id,
            status: updatedRide.status,
            cancelledBy: updatedRide.cancelledBy,
            cancelReason: updatedRide.cancelReason,
            cancelledAt: updatedRide.cancelledAt,
        };

        if (hadDriver) {
            // Both are in ride:{rideId} — emit once to the room
            getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_CANCELLED, cancelPayload);
            // Room cleanup for both
            leaveRideRoom(riderId, rideId);
            if (assignedDriverDoc) {
                leaveRideRoom(assignedDriverDoc.user.toString(), rideId);
                // Push notification to driver that rider cancelled — fire-and-forget
                sendRideCancelled(assignedDriverDoc.user.toString(), "rider", updatedRide);
            }
        } else {
            // No driver assigned yet — notify the rider directly
            getIO().to(`user:${riderId}`).emit(SOCKET_EVENTS.RIDE_CANCELLED, cancelPayload);
            // Also dissolve the request room so every driver who received the
            // original dispatch gets RIDE_UNAVAILABLE and dismisses the card.
            dissolveRequestRoom(rideId);
        }

        return res.status(200).json(
            new ApiResponse(200, updatedRide, "Ride cancelled successfully by rider")
        );
    }

    // ── Driver cancellation ──────────────────────────────────────────────────
    if (req.user.role === "driver") {
        const driver = await Driver.findOne({ user: req.user._id });
        if (!driver) {
            throw new ApiError(404, "Driver profile not found");
        }

        if (!ride.driver || ride.driver.toString() !== driver._id.toString()) {
            throw new ApiError(403, "You are not assigned to this ride");
        }

        if (!["accepted", "arriving"].includes(ride.status)) {
            throw new ApiError(400, "Only accepted/arriving rides can be cancelled by the driver");
        }

        const riderId = ride.rider.toString();
        const driverUserId = req.user._id.toString();

        // Re-queue the ride (back to "requested" with no driver)
        // Fix: Atomic update to prevent TOCTOU race condition if rider concurrently cancels
        const updatedRide = await Ride.findOneAndUpdate(
            { _id: rideId, status: { $in: ["accepted", "arriving"] } },
            {
                $set: {
                    status: "requested",
                    driver: null,
                    cancelledBy: null,
                    cancelledAt: null,
                    cancelReason: null
                }
            },
            { new: true }
        );

        if (!updatedRide) {
            throw new ApiError(400, "Ride state changed before cancellation could complete.");
        }

        // Re-populate rider for the broadcast payload
        await updatedRide.populate("rider", "username fullname avatar");

        // Make the driver available again
        driver.status = "available";
        await driver.save();

        const cancelPayload = {
            _id: updatedRide._id,
            status: "cancelled",
            cancelledBy: "driver",
            cancelReason: updatedRide.cancelReason,
            cancelledAt: updatedRide.cancelledAt,
        };

        // Notify the rider their driver cancelled
        getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_CANCELLED, cancelPayload);

        // Push notification to rider — fire-and-forget
        sendRideCancelled(riderId, "driver", updatedRide);

        // ── Room cleanup ─────────────────────────────────────────────────────
        leaveRideRoom(riderId, rideId);
        leaveRideRoom(driverUserId, rideId);

        // Driver goes back into the available pool
        getIO().in(`user:${driverUserId}`).socketsJoin("drivers:available");

        // Re-dispatch to nearby available drivers using the same geo-query logic.
        // This ensures the re-queued ride only goes to drivers near the pickup,
        // not every online driver globally.
        const rideObj = updatedRide.toObject();
        // CRIT-4: Strip OTP from the re-dispatch payload.
        delete rideObj.otp;
        const nearbyDrivers = await findNearbyAvailableDrivers(updatedRide.pickup.location.coordinates, driver._id);

        if (nearbyDrivers.length > 0) {
            for (const d of nearbyDrivers) {
                const nearbyUserId = d.user.toString();
                getIO().to(`user:${nearbyUserId}`).emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, rideObj);
                joinRequestRoom(nearbyUserId, rideId);
            }
            console.log(
                `[Dispatch] Re-queued ride ${rideId} sent to ${nearbyDrivers.length} nearby driver(s)`
            );
        }

        return res.status(200).json(
            new ApiResponse(200, updatedRide, "Ride returned to available rides queue")
        );
    }

    throw new ApiError(403, "Unauthorized role");
});

// ─── Get current active ride ─────────────────────────────────────────────────
// GET /api/v1/rides/current
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

    let rideQuery = Ride.findOne(query)
        .populate("rider", "username fullname avatar")
        .populate({
            path: "driver",
            populate: [
                { path: "user", select: "username fullname avatar" },
                { path: "vehicle" }
            ]
        });

    // Only expose the OTP to the rider who requested the ride
    if (req.user.role === "rider") {
        rideQuery = rideQuery.select("+otp");
    }

    const ride = await rideQuery;

    return res.status(200).json(
        new ApiResponse(200, ride, ride ? "Current active ride fetched successfully" : "No active ride found")
    );
});

// ─── Get ride history ────────────────────────────────────────────────────────
// GET /api/v1/rides/history
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
