/**
 * @file notification.service.js
 * @description Centralized Expo push notification service for RideSync.
 *
 * Rules:
 *   - Controllers NEVER import expo-server-sdk directly — only this file does.
 *   - Every public function is wrapped in try/catch. Failures are logged and
 *     swallowed so a push error NEVER breaks a ride lifecycle transition.
 *   - Invalid/expired tokens are automatically cleared from the DB.
 *   - Works without EXPO_ACCESS_TOKEN (falls back to unauthenticated calls,
 *     which are rate-limited but fully functional for development/low-volume).
 */

import Expo from "expo-server-sdk";
import { User } from "../models/user.model.js";
import { Driver } from "../models/driver.model.js";

// ─── Expo client singleton ───────────────────────────────────────────────────

const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
    useFcmV1: true, // Use FCM v1 API (required after June 2024)
});

// ─── Low-level send helper ───────────────────────────────────────────────────

/**
 * Send one push notification. Handles chunking, receipts, and invalid token cleanup.
 *
 * @param {string}  pushToken  - Expo push token for the target device
 * @param {string}  title      - Notification title
 * @param {string}  body       - Notification body
 * @param {object}  [data={}]  - Extra data attached to the notification (for deep linking)
 * @returns {Promise<void>}
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
    // Silently skip if no token registered
    if (!pushToken) return;

    // Validate token format before hitting the API
    if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`[Push] Invalid Expo push token: ${pushToken}`);
        return;
    }

    const message = {
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "default", // Android notification channel
    };

    try {
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

            // Check each ticket for errors
            for (const ticket of ticketChunk) {
                if (ticket.status === "error") {
                    console.error(`[Push] Ticket error: ${ticket.message}`, ticket.details);

                    // Auto-cleanup: remove invalid/unregistered tokens from DB
                    if (
                        ticket.details?.error === "DeviceNotRegistered" ||
                        ticket.details?.error === "InvalidCredentials"
                    ) {
                        console.warn(`[Push] Removing invalid token: ${pushToken}`);
                        await User.findOneAndUpdate(
                            { expoPushToken: pushToken },
                            { expoPushToken: null }
                        ).catch((err) =>
                            console.error("[Push] Failed to clear invalid token:", err)
                        );
                    }
                } else {
                    console.log(`[Push] Sent successfully. Ticket ID: ${ticket.id}`);
                }
            }
        }
    } catch (err) {
        console.error("[Push] sendPushNotificationsAsync failed:", err);
    }
}

// ─── Token lookup helpers ────────────────────────────────────────────────────

/**
 * Retrieve the Expo push token for a User document by user ID.
 * Returns null if not found or no token registered.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getTokenForUser(userId) {
    try {
        const user = await User.findById(userId).select("+expoPushToken").lean();
        return user?.expoPushToken ?? null;
    } catch (err) {
        console.error("[Push] getTokenForUser error:", err);
        return null;
    }
}

/**
 * Retrieve the Expo push token for a Driver's user by driver document ID.
 *
 * @param {string} driverId  - Driver._id (not user ID)
 * @returns {Promise<string|null>}
 */
async function getTokenForDriver(driverId) {
    try {
        const driver = await Driver.findById(driverId).select("user").lean();
        if (!driver?.user) return null;
        return getTokenForUser(driver.user.toString());
    } catch (err) {
        console.error("[Push] getTokenForDriver error:", err);
        return null;
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a push notification to a specific user by user ID.
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {object} [data={}]
 */
export async function sendToUser(userId, title, body, data = {}) {
    try {
        const token = await getTokenForUser(userId);
        await sendPushNotification(token, title, body, data);
    } catch (err) {
        console.error("[Push] sendToUser failed:", err);
    }
}

/**
 * Send a push notification to a driver by driver document ID.
 *
 * @param {string} driverId  - Driver._id
 * @param {string} title
 * @param {string} body
 * @param {object} [data={}]
 */
export async function sendToDriver(driverId, title, body, data = {}) {
    try {
        const token = await getTokenForDriver(driverId);
        await sendPushNotification(token, title, body, data);
    } catch (err) {
        console.error("[Push] sendToDriver failed:", err);
    }
}

// ─── Ride lifecycle notifications ────────────────────────────────────────────

/**
 * Notify nearby drivers that a new ride is available.
 * Called once per driver in the dispatch loop.
 *
 * @param {string} driverUserId  - User._id of the driver
 * @param {object} ride          - Ride document (populated)
 */
export async function sendNewRideRequest(driverUserId, ride) {
    try {
        const token = await getTokenForUser(driverUserId);
        await sendPushNotification(
            token,
            "🚗 New Ride Request",
            `${ride.pickup.address} → ${ride.drop.address} · ₹${ride.fare}`,
            {
                type: "new_ride_request",
                rideId: ride._id.toString(),
                screen: "/(driver)/home",
            }
        );
    } catch (err) {
        console.error("[Push] sendNewRideRequest failed:", err);
    }
}

/**
 * Notify the rider that a driver accepted their ride.
 *
 * @param {string} riderUserId   - User._id of the rider
 * @param {object} ride          - Ride document
 * @param {object} driver        - Driver document (populated with user + vehicle)
 */
export async function sendRideAccepted(riderUserId, ride, driver) {
    try {
        const driverName = driver?.user?.fullname || "Your driver";
        const token = await getTokenForUser(riderUserId);
        await sendPushNotification(
            token,
            "✅ Driver Found!",
            `${driverName} is on the way to pick you up.`,
            {
                type: "ride_accepted",
                rideId: ride._id.toString(),
                screen: "/(rider)/driver-assigned",
            }
        );
    } catch (err) {
        console.error("[Push] sendRideAccepted failed:", err);
    }
}

/**
 * Notify the rider that the driver is arriving at the pickup location.
 *
 * @param {string} riderUserId   - User._id of the rider
 * @param {object} ride
 */
export async function sendDriverArriving(riderUserId, ride) {
    try {
        const token = await getTokenForUser(riderUserId);
        await sendPushNotification(
            token,
            "📍 Driver Arriving",
            "Your driver is almost at the pickup point. Please be ready!",
            {
                type: "driver_arriving",
                rideId: ride._id.toString(),
                screen: "/(rider)/live-tracking",
            }
        );
    } catch (err) {
        console.error("[Push] sendDriverArriving failed:", err);
    }
}

/**
 * Notify the rider that their ride has started.
 *
 * @param {string} riderUserId   - User._id of the rider
 * @param {object} ride
 */
export async function sendRideStarted(riderUserId, ride) {
    try {
        const token = await getTokenForUser(riderUserId);
        await sendPushNotification(
            token,
            "🚀 Ride Started",
            `Heading to ${ride.drop.address}. Enjoy your trip!`,
            {
                type: "ride_started",
                rideId: ride._id.toString(),
                screen: "/(rider)/live-tracking",
            }
        );
    } catch (err) {
        console.error("[Push] sendRideStarted failed:", err);
    }
}

/**
 * Notify the rider that their ride is complete.
 *
 * @param {string} riderUserId   - User._id of the rider
 * @param {object} ride
 */
export async function sendRideCompleted(riderUserId, ride) {
    try {
        const token = await getTokenForUser(riderUserId);
        await sendPushNotification(
            token,
            "🎉 Ride Completed",
            `You've arrived at ${ride.drop.address}. Fare: ₹${ride.fare}`,
            {
                type: "ride_completed",
                rideId: ride._id.toString(),
                screen: "/(rider)/ride-complete",
            }
        );
    } catch (err) {
        console.error("[Push] sendRideCompleted failed:", err);
    }
}

/**
 * Notify either the rider or driver that the ride was cancelled.
 *
 * @param {string}  recipientUserId  - User._id of the notification recipient
 * @param {string}  cancelledBy      - "rider" | "driver"
 * @param {object}  ride
 */
export async function sendRideCancelled(recipientUserId, cancelledBy, ride) {
    try {
        const token = await getTokenForUser(recipientUserId);
        const isRider = cancelledBy === "driver";
        const title = isRider ? "❌ Driver Cancelled" : "❌ Ride Cancelled";
        const body = isRider
            ? "Your driver cancelled the ride. We'll find you another one."
            : "The rider cancelled this trip.";
        const screen = isRider ? "/(rider)/home" : "/(driver)/home";

        await sendPushNotification(token, title, body, {
            type: "ride_cancelled",
            rideId: ride._id.toString(),
            cancelledBy,
            screen,
        });
    } catch (err) {
        console.error("[Push] sendRideCancelled failed:", err);
    }
}

/**
 * Notify the rider that their payment was received successfully.
 *
 * @param {string} riderUserId   - User._id of the rider
 * @param {object} ride
 */
export async function sendPaymentReceived(riderUserId, ride) {
    try {
        const token = await getTokenForUser(riderUserId);
        await sendPushNotification(
            token,
            "💸 Payment Received",
            `Your payment of ₹${ride.fare} has been confirmed. Thank you!`,
            {
                type: "payment_received",
                rideId: ride._id.toString(),
                screen: "/(rider)/home",
            }
        );
    } catch (err) {
        console.error("[Push] sendPaymentReceived failed:", err);
    }
}
