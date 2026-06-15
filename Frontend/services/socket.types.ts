/**
 * @file socket.types.ts
 * @description TypeScript interfaces for all Socket.IO payloads in RideSync.
 *
 * Keep these in sync with the server-side SOCKET_EVENTS and the
 * ride/driver/user Mongoose models.
 */

// ─── Shared sub-types ──────────────────────────────────────────────────────

export interface GeoPoint {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface LocationAddress {
    address: string;
    location: GeoPoint;
}

export interface AvatarObject {
    url: string | null;
    public_id: string | null;
}

export interface RiderInfo {
    _id: string;
    username: string;
    fullname: string;
    avatar: AvatarObject;
}

export interface VehicleInfo {
    _id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    vehicleVerified: "pending" | "under_review" | "verified" | "rejected";
}

export interface DriverInfo {
    _id: string;
    user: RiderInfo; // user is populated with same shape as RiderInfo
    vehicle: VehicleInfo | null;
    status: "available" | "busy" | "offline";
}

// ─── Server → Client event payloads ───────────────────────────────────────

/**
 * ride:new_request
 * Received by drivers in the drivers:available room when a rider creates a ride.
 */
export interface NewRideRequestPayload {
    _id: string;
    rider: RiderInfo;
    pickup: LocationAddress;
    drop: LocationAddress;
    fare: number;
    distance: number | null;
    status: "requested";
    createdAt: string; // ISO 8601
}

/**
 * ride:accepted
 * Received by the rider (and driver) inside ride:{rideId} room when a driver accepts.
 */
export interface RideAcceptedPayload {
    ride: {
        _id: string;
        rider: RiderInfo;
        pickup: LocationAddress;
        drop: LocationAddress;
        fare: number;
        distance: number | null;
        status: "accepted";
        acceptedAt: string;
        otp?: string;
    };
    driver: DriverInfo;
}

/**
 * ride:status_updated
 * Received by both rider and driver inside ride:{rideId}.
 * Covers the "arriving" and "started" transitions.
 */
export interface RideStatusUpdatedPayload {
    _id: string;
    status: "arriving" | "started";
    arrivedAt?: string | null;  // set when status === "arriving"
    startedAt?: string | null;  // set when status === "started"
}

/**
 * ride:completed
 * Received by both rider and driver inside ride:{rideId}.
 */
export interface RideCompletedPayload {
    _id: string;
    status: "completed";
    completedAt: string;
    fare: number;
    distance: number;
}

/**
 * ride:cancelled
 * Received by both rider and driver inside ride:{rideId}.
 */
export interface RideCancelledPayload {
    _id: string;
    status: "cancelled";
    cancelledBy: "rider" | "driver" | "system";
    cancelReason: string | null;
    cancelledAt: string;
}

/**
 * driver:location_update
 * Received by the rider inside ride:{rideId} as the driver moves.
 */
export interface DriverLocationPayload {
    rideId: string;
    location: {
        lat: number;
        lng: number;
    };
    timestamp: string; // ISO 8601
}

/**
 * socket:error
 * Sent back to the socket that triggered an invalid operation.
 */
export interface SocketErrorPayload {
    message: string;
    context: string | null; // The event name that caused the error
    timestamp: string;
}

/**
 * ride:unavailable
 * Received by drivers inside ride-request:{rideId} room when the ride is
 * no longer bookable — either accepted by another driver or cancelled by the rider.
 * The driver UI should dismiss the request card upon receiving this event.
 */
export interface RideUnavailablePayload {
    rideId: string;
    timestamp: string;
}

// ─── Client → Server event payloads ───────────────────────────────────────

/**
 * update_location — emitted by the driver
 */
export interface UpdateLocationPayload {
    lat: number;
    lng: number;
}

// ─── Event name constants (mirrors socket.events.js on the server) ─────────
// Copy of server constants so we avoid raw string literals in components.

export const SOCKET_EVENTS = {
    // Client → Server
    UPDATE_LOCATION:     "update_location",
    DRIVER_GO_ONLINE:    "driver:go_online",
    DRIVER_GO_OFFLINE:   "driver:go_offline",

    // Server → Client
    NEW_RIDE_REQUEST:    "ride:new_request",
    RIDE_ACCEPTED:       "ride:accepted",
    RIDE_STATUS_UPDATED: "ride:status_updated",
    RIDE_COMPLETED:      "ride:completed",
    RIDE_CANCELLED:      "ride:cancelled",
    DRIVER_LOCATION:     "driver:location_update",
    RIDE_UNAVAILABLE:    "ride:unavailable",
    ERROR:               "socket:error",
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
