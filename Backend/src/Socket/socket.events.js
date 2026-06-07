/**
 * @file socket.events.js
 * @description Centralized registry of every Socket.IO event name used in RideSync.
 *
 * Rules:
 *  - Client → Server events use plain verb names  (e.g. "update_location")
 *  - Server → Client events use namespaced names  (e.g. "ride:accepted")
 *  - Import this file in every place that emits or listens to socket events
 *    so a single rename here propagates everywhere.
 */

export const SOCKET_EVENTS = {
    // ── Client → Server ────────────────────────────────────────────────────
    /** Driver sends GPS coordinates during a ride */
    UPDATE_LOCATION: "update_location",

    /** Driver explicitly comes on-duty (joins drivers:available room) */
    DRIVER_GO_ONLINE: "driver:go_online",

    /** Driver explicitly goes off-duty (leaves drivers:available room) */
    DRIVER_GO_OFFLINE: "driver:go_offline",

    // ── Server → Client ────────────────────────────────────────────────────
    /** Broadcast to drivers:available — a new ride is waiting */
    NEW_RIDE_REQUEST: "ride:new_request",

    /** Sent to ride:{id} room — a driver accepted the ride */
    RIDE_ACCEPTED: "ride:accepted",

    /**
     * Sent to ride:{id} room on status transitions:
     *   requested → accepted (internal only, client gets ride:accepted instead)
     *   accepted  → arriving
     *   arriving  → started
     */
    RIDE_STATUS_UPDATED: "ride:status_updated",

    /** Sent to ride:{id} room when the ride is marked complete */
    RIDE_COMPLETED: "ride:completed",

    /**
     * Sent to ride:{id} room when a ride is cancelled.
     * If driver cancels, the re-queued ride is also broadcast on NEW_RIDE_REQUEST.
     */
    RIDE_CANCELLED: "ride:cancelled",

    /** Sent to ride:{id} room — relays driver GPS to the rider */
    DRIVER_LOCATION: "driver:location_update",

    /** Sent to the socket that caused an error (auth, validation, etc.) */
    ERROR: "socket:error",
};
