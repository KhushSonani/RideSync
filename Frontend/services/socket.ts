/**
 * @file socket.ts
 * @description RideSync Socket.IO client service.
 *
 * Usage:
 *   // After login:
 *   connectSocket(accessToken);
 *
 *   // In a screen/component:
 *   const off = onRideAccepted((payload) => { ... });
 *   return () => off(); // cleanup on unmount
 *
 *   // Driver location:
 *   emitLocationUpdate(28.6139, 77.2090);
 *
 *   // Logout:
 *   disconnectSocket();
 */

import { io, Socket } from "socket.io-client";
import {
    SOCKET_EVENTS,
    type NewRideRequestPayload,
    type RideAcceptedPayload,
    type RideStatusUpdatedPayload,
    type RideCompletedPayload,
    type RideCancelledPayload,
    type DriverLocationPayload,
    type SocketErrorPayload,
    type UpdateLocationPayload,
    type RideUnavailablePayload,
} from "./socket.types";

// ─── Config ─────────────────────────────────────────────────────────────────

const SOCKET_URL = "https://myspace-clumsy-sprawl.ngrok-free.dev";

// ─── Singleton instance ──────────────────────────────────────────────────────

let socket: Socket | null = null;

// ─── Connection lifecycle ────────────────────────────────────────────────────

/**
 * Initialises and connects the socket with a JWT token for authentication.
 * Call this immediately after a successful login.
 *
 * If the socket already exists and is connected, the existing instance is
 * returned without creating a new connection.
 */
export const connectSocket = (token: string): Socket => {
    if (socket && socket.connected) {
        return socket;
    }

    // Clean up any stale (disconnected) socket before creating a fresh one
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    socket = io(SOCKET_URL, {
        transports: ["websocket"],
        auth: { token },

        // Auto-reconnect with exponential backoff
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,         // initial delay (ms)
        reconnectionDelayMax: 15000,     // cap (ms)
        randomizationFactor: 0.4,        // jitter
    });

    // ── Core lifecycle logs ──────────────────────────────────────────────────
    socket.on("connect", () => {
        console.log("[Socket] Connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
        console.log("[Socket] Connection Error:", err.message);
    });

    socket.on("reconnect", (attempt) => {
        console.log(`[Socket] Reconnected after ${attempt} attempt(s)`);
    });

    socket.on("reconnect_attempt", (attempt) => {
        console.log(`[Socket] Reconnect attempt #${attempt}`);
    });

    socket.on("reconnect_failed", () => {
        console.log("[Socket] All reconnect attempts failed");
    });

    return socket;
};

/**
 * Returns the active socket instance.
 * Throws if connectSocket() has not been called yet.
 */
export const getSocket = (): Socket => {
    if (!socket) {
        throw new Error("Socket not initialised. Call connectSocket(token) first.");
    }
    return socket;
};

/**
 * Disconnects and destroys the socket instance.
 * Call this on logout to prevent stale listeners and dangling connections.
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        console.log("[Socket] Disconnected and cleaned up.");
    }
};

/**
 * Returns true if the socket is currently connected.
 */
export const isSocketConnected = (): boolean => {
    return socket?.connected ?? false;
};

// ─── Server → Client listener helpers ───────────────────────────────────────
// Each helper returns an unsubscribe function so callers can clean up in
// React useEffect return statements without importing SOCKET_EVENTS directly.

/**
 * This are event Listener setup functions for socket.io
 * Listen for a new ride request (drivers only).
 * @returns Unsubscribe function 
*/
export const onNewRideRequest =
    (callback: (payload: NewRideRequestPayload) => void):
        (() => void) => {
        const s = getSocket();
        s.on(SOCKET_EVENTS.NEW_RIDE_REQUEST, callback);
        return () => s.off(SOCKET_EVENTS.NEW_RIDE_REQUEST, callback);
    };

/**
 * Listen for ride accepted event (fired for both rider and driver).
 * @returns Unsubscribe function
 */
export const onRideAccepted = (
    callback: (payload: RideAcceptedPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.RIDE_ACCEPTED, callback);
    return () => s.off(SOCKET_EVENTS.RIDE_ACCEPTED, callback);
};

/**
 * Listen for ride status changes: "arriving" and "started".
 * @returns Unsubscribe function
 */
export const onRideStatusUpdated = (
    callback: (payload: RideStatusUpdatedPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.RIDE_STATUS_UPDATED, callback);
    return () => s.off(SOCKET_EVENTS.RIDE_STATUS_UPDATED, callback);
};

/**
 * Listen for ride completed event.
 * @returns Unsubscribe function
 */
export const onRideCompleted = (
    callback: (payload: RideCompletedPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.RIDE_COMPLETED, callback);
    return () => s.off(SOCKET_EVENTS.RIDE_COMPLETED, callback);
};

/**
 * Listen for ride cancelled event (fired for both rider and driver).
 * @returns Unsubscribe function
 */
export const onRideCancelled = (
    callback: (payload: RideCancelledPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.RIDE_CANCELLED, callback);
    return () => s.off(SOCKET_EVENTS.RIDE_CANCELLED, callback);
};

/**
 * Listen for real-time driver location updates (riders only, during a ride).
 * @returns Unsubscribe function
 */
export const onDriverLocation = (
    callback: (payload: DriverLocationPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.DRIVER_LOCATION, callback);
    return () => s.off(SOCKET_EVENTS.DRIVER_LOCATION, callback);
};

/**
 * Listen for server-side socket errors (validation, auth, etc.).
 * @returns Unsubscribe function
 */
export const onSocketError = (
    callback: (payload: SocketErrorPayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.ERROR, callback);
    return () => s.off(SOCKET_EVENTS.ERROR, callback);
};

/**
 * Listen for ride unavailable event (drivers only).
 * Fired when another driver accepted the ride first, or the rider cancelled
 * before anyone accepted. Use this to dismiss the request card from the UI.
 * @returns Unsubscribe function
 */
export const onRideUnavailable = (
    callback: (payload: RideUnavailablePayload) => void
): (() => void) => {
    const s = getSocket();
    s.on(SOCKET_EVENTS.RIDE_UNAVAILABLE, callback);
    return () => s.off(SOCKET_EVENTS.RIDE_UNAVAILABLE, callback);
};

/**
 * Remove ALL listeners for a given event.
 * Useful when a screen unmounts and you want a full teardown.
 */
export const offAll = (event: string): void => {
    socket?.removeAllListeners(event);
};

// ─── Client → Server emit helpers ───────────────────────────────────────────

/**
 * Send a GPS location update to the server (drivers only).
 * The server throttles these to once per 2 seconds — calling more frequently
 * is safe but excess events will be silently dropped server-side.
 */
export const emitLocationUpdate = (lat: number, lng: number): void => {
    const payload: UpdateLocationPayload = { lat, lng };
    getSocket().emit(SOCKET_EVENTS.UPDATE_LOCATION, payload);
};

/**
 * Tell the server the driver is going on-duty.
 * The server will set status → "available" in DB and add the driver to the
 * drivers:available broadcast room.
 */
export const emitGoOnline = (): void => {
    getSocket().emit(SOCKET_EVENTS.DRIVER_GO_ONLINE);
};

/**
 * Tell the server the driver is going off-duty.
 * The server will set status → "offline" in DB and remove from the
 * drivers:available room.
 */
export const emitGoOffline = (): void => {
    getSocket().emit(SOCKET_EVENTS.DRIVER_GO_OFFLINE);
};
