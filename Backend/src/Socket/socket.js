/**
 * @file socket.js
 * @description Production-grade Socket.IO server for RideSync.
 *
 * Room strategy:
 *   user:{userId}       – Every connected user. Used for targeted direct delivery.
 *   drivers:available   – Online + available verified drivers. Used to broadcast
 *                         new ride requests without hitting ALL sockets.
 *   ride:{rideId}       – The active rider + assigned driver. Used for all
 *                         in-ride events (location, status, complete, cancel).
 *
 * State rules:
 *   - All DB mutations live in REST controllers. Sockets are notification-only.
 *   - Driver online/offline state IS managed here because it is purely
 *     connection-lifecycle driven and has no REST endpoint.
 *   - Location updates are throttled to max 1 per LOCATION_THROTTLE_MS per
 *     driver to avoid DB thrash and rider-side flooding.
 */

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Driver } from "../models/driver.model.js";
import { Ride } from "../models/ride.model.js";
import { SOCKET_EVENTS } from "./socket.events.js";
import { ApiError } from "../utils/ApiError.js";

// How often (ms) a driver's location update is allowed to hit the DB and
// propagate to the rider. GPS events that arrive faster are silently dropped.
const LOCATION_THROTTLE_MS = 2000;

/** @type {Server} */
let io;

// ─── Per-driver location throttle map ─────────────────────────────────────
// Map<socketId, lastEmittedTimestamp>
const locationThrottle = new Map();

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Emit a structured error back to the socket that caused it.
 * Never throws — safe to call from any event handler.
 *
 * @param {import("socket.io").Socket} socket
 * @param {string} message
 * @param {string} [context]  The event name that caused the error
 */
function emitError(socket, message, context) {
    socket.emit(SOCKET_EVENTS.ERROR, {
        message,
        context: context ?? null,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Validate that lat/lng values are plausible GPS coordinates.
 *
 * @param {unknown} lat
 * @param {unknown} lng
 * @returns {boolean}
 */
function isValidCoordinates(lat, lng) {
    return (
        typeof lat === "number" && isFinite(lat) &&
        typeof lng === "number" && isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
}

// ─── Auth Middleware ────────────────────────────────────────────────────────

/**
 * Socket.IO auth middleware — runs before every connection is established.
 *
 * Attaches to socket:
 *   socket.user   – The User document (password & refreshToken excluded)
 *   socket.driver – The Driver document (only when user.role === "driver")
 */
async function authMiddleware(socket, next) {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Authentication error: Token missing"));
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
        } catch {
            return next(new ApiError(401, "Authentication error: Invalid or expired token"));
        }

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            return next(new ApiError(404, "Authentication error: User not found"));
        }

        socket.user = user;

        // Pre-fetch driver document so event handlers never need a DB lookup
        if (user.role === "driver") {
            const driver = await Driver.findOne({ user: user._id }).populate("vehicle");
            socket.driver = driver ?? null;
        }

        return next();
    } catch (error) {
        console.error("[Socket Auth]", error);
        return next(new ApiError(500, "Authentication error: Internal failure"));
    }
}

// ─── Connection Handler ─────────────────────────────────────────────────────

async function onConnection(socket) {
    const userId = socket.user._id.toString();
    const role = socket.user.role;

    console.log(
        `[Socket] Connected: ${socket.id} | User: ${userId} | Role: ${role}`
    );

    // ── 1. Always join user personal room ──────────────────────────────────
    socket.join(`user:${userId}`);

    // ── 2. Persist socketId on the User document ───────────────────────────
    // Allows admin tooling to target specific sockets by DB query if ever needed.
    await User.findByIdAndUpdate(userId, { socketId: socket.id }).catch((err) =>
        console.error("[Socket] Failed to persist socketId:", err)
    );

    // ── 3. Driver-specific setup ───────────────────────────────────────────
    if (role === "driver" && socket.driver) {
        if (socket.driver.status === "available") {
            socket.join("drivers:available");
            console.log(`[Socket] Driver ${userId} rejoined drivers:available room`);
        }
    }

    // ── 4. Reconnection recovery — rejoin active ride room ─────────────────
    await rejoinActiveRideRoom(socket, userId, role);

    // ── Event handlers ─────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.UPDATE_LOCATION, (data) =>
        handleUpdateLocation(socket, data)
    );
    socket.on(SOCKET_EVENTS.DRIVER_GO_ONLINE, () =>
        handleDriverGoOnline(socket)
    );
    socket.on(SOCKET_EVENTS.DRIVER_GO_OFFLINE, () =>
        handleDriverGoOffline(socket)
    );
    socket.on("disconnect", (reason) =>
        handleDisconnect(socket, reason)
    );
}

// ─── Reconnection Recovery ──────────────────────────────────────────────────

/**
 * If the user has an active ride, make the socket rejoin its ride room.
 * This ensures that a reconnecting rider or driver immediately starts
 * receiving scoped ride events again without any REST roundtrip.
 */
async function rejoinActiveRideRoom(socket, userId, role) {
    try {
        let query = {};
        if (role === "rider") {
            query = {
                rider: userId,
                status: { $in: ["requested", "accepted", "arriving", "started"] },
            };
        } else if (role === "driver" && socket.driver) {
            query = {
                driver: socket.driver._id,
                status: { $in: ["accepted", "arriving", "started"] },
            };
        } else {
            return;
        }

        const activeRide = await Ride.findOne(query).select("_id").lean();
        if (activeRide) {
            const rideRoom = `ride:${activeRide._id.toString()}`;
            socket.join(rideRoom);
            console.log(
                `[Socket] ${role} ${userId} rejoined ride room ${rideRoom} after reconnect`
            );
        }
    } catch (err) {
        console.error("[Socket] Reconnect ride-room recovery failed:", err);
    }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

/**
 * Handles GPS location updates from a driver socket.
 *
 * - Validates payload
 * - Throttles to LOCATION_THROTTLE_MS
 * - Persists to Driver.location in DB
 * - Relays to the ride:{rideId} room so the rider sees it in real time
 */
async function handleUpdateLocation(socket, data) {
    if (socket.user.role !== "driver") {
        return emitError(socket, "Only drivers can update location", SOCKET_EVENTS.UPDATE_LOCATION);
    }

    if (!socket.driver) {
        return emitError(socket, "Driver profile not found", SOCKET_EVENTS.UPDATE_LOCATION);
    }

    const { lat, lng } = data ?? {};

    if (!isValidCoordinates(lat, lng)) {
        return emitError(
            socket,
            "Invalid coordinates. Expected { lat: number, lng: number } within valid GPS ranges.",
            SOCKET_EVENTS.UPDATE_LOCATION
        );
    }

    // Throttle check
    const now = Date.now();
    const lastEmit = locationThrottle.get(socket.id) ?? 0;
    if (now - lastEmit < LOCATION_THROTTLE_MS) {
        return; // silently drop — client sends too fast
    }
    locationThrottle.set(socket.id, now);

    try {
        // Persist to DB
        await Driver.findByIdAndUpdate(socket.driver._id, {
            location: { type: "Point", coordinates: [lng, lat] },
        });

        // Relay to active ride room if the driver has one
        const activeRide = await Ride.findOne({
            driver: socket.driver._id,
            status: { $in: ["accepted", "arriving", "started"] },
        })
            .select("_id")
            .lean();

        if (activeRide) {
            io.to(`ride:${activeRide._id.toString()}`).emit(
                SOCKET_EVENTS.DRIVER_LOCATION,
                {
                    rideId: activeRide._id.toString(),
                    location: { lat, lng },
                    timestamp: new Date().toISOString(),
                }
            );
        }
    } catch (err) {
        console.error("[Socket] update_location error:", err);
        emitError(socket, "Failed to update location", SOCKET_EVENTS.UPDATE_LOCATION);
    }
}

/**
 * Driver explicitly goes on-duty.
 * Sets status → "available" in DB and joins the drivers:available room.
 */
async function handleDriverGoOnline(socket) {
    if (socket.user.role !== "driver" || !socket.driver) {
        return emitError(socket, "Only drivers can use this event", SOCKET_EVENTS.DRIVER_GO_ONLINE);
    }

    try {
        await Driver.findByIdAndUpdate(socket.driver._id, { status: "available" });
        socket.driver.status = "available";

        socket.join("drivers:available");
        console.log(
            `[Socket] Driver ${socket.user._id} is now ONLINE and in drivers:available`
        );

        // Acknowledge back to the driver client
        socket.emit(SOCKET_EVENTS.DRIVER_GO_ONLINE, {
            status: "available",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[Socket] driver:go_online error:", err);
        emitError(socket, "Failed to go online", SOCKET_EVENTS.DRIVER_GO_ONLINE);
    }
}

/**
 * Driver explicitly goes off-duty.
 * Sets status → "offline" in DB and leaves the drivers:available room.
 */
async function handleDriverGoOffline(socket) {
    if (socket.user.role !== "driver" || !socket.driver) {
        return emitError(socket, "Only drivers can use this event", SOCKET_EVENTS.DRIVER_GO_OFFLINE);
    }

    try {
        await Driver.findByIdAndUpdate(socket.driver._id, { status: "offline" });
        socket.driver.status = "offline";

        socket.leave("drivers:available");
        console.log(`[Socket] Driver ${socket.user._id} is now OFFLINE`);

        socket.emit(SOCKET_EVENTS.DRIVER_GO_OFFLINE, {
            status: "offline",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[Socket] driver:go_offline error:", err);
        emitError(socket, "Failed to go offline", SOCKET_EVENTS.DRIVER_GO_OFFLINE);
    }
}

/**
 * Cleanup on disconnect.
 *
 * - Clears location throttle entry
 * - Sets driver status → "offline" in DB (unless they are in an active ride,
 *   in which case we leave them "busy" so the ride can be recovered on reconnect)
 * - Clears socketId on User document
 */
async function handleDisconnect(socket, reason) {
    const userId = socket.user._id.toString();
    console.log(
        `[Socket] Disconnected: ${socket.id} | User: ${userId} | Reason: ${reason}`
    );

    // Clean up throttle map
    locationThrottle.delete(socket.id);

    // Clear socketId in DB
    await User.findByIdAndUpdate(userId, { socketId: null }).catch((err) =>
        console.error("[Socket] Failed to clear socketId:", err)
    );

    // Set driver offline only when NOT in an active ride
    // (busy drivers should stay "busy" so they can recover on reconnect)
    if (socket.user.role === "driver" && socket.driver) {
        try {
            const hasActiveRide = await Ride.exists({
                driver: socket.driver._id,
                status: { $in: ["accepted", "arriving", "started"] },
            });

            if (!hasActiveRide) {
                await Driver.findByIdAndUpdate(socket.driver._id, {
                    status: "offline",
                });
                console.log(`[Socket] Driver ${userId} set to OFFLINE on disconnect`);
            } else {
                console.log(
                    `[Socket] Driver ${userId} has an active ride — keeping status "busy" for reconnect`
                );
            }
        } catch (err) {
            console.error("[Socket] Disconnect cleanup error:", err);
        }
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialise the Socket.IO server and attach it to the HTTP server.
 * Call once from server.js after the HTTP server is created.
 *
 * @param {import("http").Server} server
 * @returns {Server}
 */
export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
        // Tune connection-state recovery so clients can reconnect quickly
        // without losing queued events (requires Socket.IO ≥ 4.6)
        connectionStateRecovery: {
            // How long to preserve the client's session after disconnect (ms)
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            // Also restore missed packets to rooms the socket was in
            skipMiddlewares: true,
        },
    });

    io.use(authMiddleware);
    io.on("connection", onConnection);

    return io;
};

/**
 * Returns the active Socket.IO server instance.
 * Throws if called before initializeSocket().
 *
 * @returns {Server}
 */
export const getIO = () => {
    if (!io) {
        throw new ApiError(500, "Socket.IO not initialized!");
    }
    return io;
};

/**
 * Make a specific socket join a ride room.
 * Called from ride.controller.js after a ride is accepted so both
 * the rider's socket and the driver's socket enter ride:{rideId}.
 *
 * @param {string} userId   The user whose sockets should join
 * @param {string} rideId
 */
export const joinRideRoom = (userId, rideId) => {
    if (!io) return;
    const room = `ride:${rideId}`;
    // io.in("user:X").socketsJoin(room) moves ALL sockets of that user into the room
    io.in(`user:${userId}`).socketsJoin(room);
    console.log(`[Socket] user:${userId} sockets joined ${room}`);
};

/**
 * Make all sockets of a user leave a ride room.
 * Called after a ride completes or is cancelled.
 *
 * @param {string} userId
 * @param {string} rideId
 */
export const leaveRideRoom = (userId, rideId) => {
    if (!io) return;
    const room = `ride:${rideId}`;
    io.in(`user:${userId}`).socketsLeave(room);
    console.log(`[Socket] user:${userId} sockets left ${room}`);
};

/**
 * Move all sockets of a user into the ride-request:{rideId} staging room.
 * Called from ride.controller.js for each nearby driver after a ride is created.
 * All members of this room will receive RIDE_UNAVAILABLE when the ride is taken
 * or cancelled, so their UI dismisses the request card automatically.
 *
 * @param {string} userId
 * @param {string} rideId
 */
export const joinRequestRoom = (userId, rideId) => {
    if (!io) return;
    const room = `ride-request:${rideId}`;
    io.in(`user:${userId}`).socketsJoin(room);
};

/**
 * Emit RIDE_UNAVAILABLE to every driver who received this ride request,
 * then force all their sockets out of the staging room (dissolves it).
 *
 * Call this exactly once — either from acceptRide (another driver won)
 * or from cancelRide (rider cancelled before anyone accepted).
 *
 * @param {string} rideId
 */
export const dissolveRequestRoom = (rideId) => {
    if (!io) return;
    const room = `ride-request:${rideId}`;
    io.to(room).emit(SOCKET_EVENTS.RIDE_UNAVAILABLE, {
        rideId,
        timestamp: new Date().toISOString(),
    });
    // Force everyone out — the room ceases to exist after this
    io.in(room).socketsLeave(room);
    console.log(`[Socket] ride-request:${rideId} dissolved`);
};