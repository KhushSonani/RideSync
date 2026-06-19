/**
 * @file notifications.ts
 * @description RideSync frontend push notification service.
 *
 * Responsibilities:
 *   - Request OS notification permission
 *   - Obtain and register the Expo push token with the backend
 *   - Remove the token on logout
 *   - Handle notification taps via deep-link routing
 *
 * Rules:
 *   - This is the ONLY file that imports expo-notifications directly.
 *   - All functions are safe to call on simulators (skips silently).
 *   - Token registration is idempotent — safe to call on every app launch.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { api } from "@/services/api";

// ─── Foreground notification behaviour ───────────────────────────────────────
// Show alert, play sound, and show badge even when app is in the foreground.

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Permission + Token ───────────────────────────────────────────────────────

/**
 * Request notification permission from the OS.
 * Returns true if granted, false otherwise.
 * Safe to call on simulators — returns false without throwing.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.log("[Push] Skipping permission request on simulator/emulator.");
        return false;
    }

    // Create default Android notification channel
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "RideSync Notifications",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#11E0C5",
            sound: "default",
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("[Push] Notification permission denied.");
        return false;
    }

    return true;
}

/**
 * Obtains the Expo push token for this device.
 * Returns the token string or null on failure / simulator.
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;

    try {
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;

        if (!projectId) {
            console.warn("[Push] No EAS projectId found in app.config.js. Push notifications will not work until projectId is configured.");
            // Still attempt without projectId for local Expo Go testing
        }

        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        return tokenData.data;
    } catch (err) {
        console.error("[Push] Failed to get Expo push token:", err);
        return null;
    }
}

/**
 * Request permission, obtain the Expo push token, and register it with
 * the RideSync backend. Safe to call on every app launch — fully idempotent.
 *
 * @returns The registered token string, or null if registration failed/skipped.
 */
export async function registerPushTokenWithServer(): Promise<string | null> {
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return null;

        const token = await getExpoPushToken();
        if (!token) return null;

        await api.post("/users/push-token", { expoPushToken: token });
        console.log("[Push] Token registered with server:", token);
        return token;
    } catch (err: any) {
        // Non-critical — never throw, just log
        console.warn(
            "[Push] Failed to register token with server:",
            err?.response?.data?.message || err?.message
        );
        return null;
    }
}

/**
 * Clear the push token from the backend on logout.
 * Prevents the signed-out device from receiving further notifications.
 * Errors are silently swallowed.
 */
export async function removePushTokenFromServer(): Promise<void> {
    try {
        await api.delete("/users/push-token");
        console.log("[Push] Token removed from server.");
    } catch (err: any) {
        console.warn(
            "[Push] Failed to remove token from server:",
            err?.response?.data?.message || err?.message
        );
    }
}

// ─── Notification tap routing ─────────────────────────────────────────────────

/**
 * Notification tap data shape sent from the backend notification service.
 */
interface NotificationData {
    type?: string;
    rideId?: string;
    screen?: string;
    cancelledBy?: string;
}

/**
 * Handle a notification tap (app opened or foregrounded from notification).
 *
 * Strategy: use `GET /rides/current` (existing recovery API — unchanged) to
 * determine the true ride state, then navigate to the correct screen. This
 * avoids stale data in the notification payload and is consistent with the
 * existing app startup recovery logic.
 *
 * @param notification - The Expo notification response object
 */
export async function handleNotificationTap(
    notification: Notifications.NotificationResponse
): Promise<void> {
    try {
        const data = notification.notification.request.content.data as NotificationData;
        const screen = data?.screen;
        const type = data?.type;

        console.log("[Push] Notification tapped:", { type, screen });

        if (!screen) return;

        // For ride-related notifications, verify state via GET /rides/current first
        const rideRelatedTypes = [
            "ride_accepted",
            "driver_arriving",
            "ride_started",
            "ride_completed",
            "ride_cancelled",
            "new_ride_request",
        ];

        if (type && rideRelatedTypes.includes(type)) {
            try {
                const res = await api.get("/rides/current");
                const ride = res.data?.data;

                if (ride) {
                    // Route based on live DB state (identical to index.tsx recovery)
                    const status = ride.status;
                    if (status === "requested") {
                        router.replace("/(rider)/searching-driver");
                    } else if (status === "accepted") {
                        router.replace("/(rider)/driver-assigned");
                    } else if (status === "arriving" || status === "started") {
                        router.replace("/(rider)/live-tracking");
                    } else if (status === "completed") {
                        router.replace("/(rider)/ride-complete");
                    } else {
                        // Cancelled or no active ride — fall through to screen hint
                        router.replace(screen as any);
                    }
                } else {
                    // No active ride — navigate to the screen hint from payload
                    router.replace(screen as any);
                }
            } catch {
                // If recovery API fails, fall back to screen hint
                router.replace(screen as any);
            }
        } else if (screen) {
            router.replace(screen as any);
        }
    } catch (err) {
        console.error("[Push] handleNotificationTap error:", err);
    }
}
