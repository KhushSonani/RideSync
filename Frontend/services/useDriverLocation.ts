/**
 * @file useDriverLocation.ts
 * @description Reusable hook for continuous driver GPS tracking.
 *
 * Usage (in a driver screen):
 *   const { permissionDenied, currentLocation, locationError } = useDriverLocation({ isActive: true });
 *
 * What it does:
 *   1. Requests expo-location foreground permission on mount.
 *   2. Starts Location.watchPositionAsync when isActive === true.
 *   3. Throttles emitLocationUpdate() to CLIENT_THROTTLE_MS (2 500 ms).
 *      The server also throttles at 2 000 ms — the client guard prevents
 *      unnecessary socket writes.
 *   4. Stops the watcher and clears the subscription on unmount or when
 *      isActive flips to false.
 *
 * Does NOT create a new socket instance — uses the singleton getSocket()
 * that was connected at login time.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as Location from "expo-location";
import { emitLocationUpdate, isSocketConnected } from "./socket";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Client-side throttle: won't emit more than once per this many ms. */
const CLIENT_THROTTLE_MS = 2_500;

/**
 * Desired GPS accuracy.
 * Balanced gives reliable ~5–15 m accuracy at reasonable battery cost.
 */
const LOCATION_ACCURACY = Location.Accuracy.Balanced;

/** Minimum distance (metres) the device must move before firing a new update. */
const DISTANCE_INTERVAL_M = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverLatLng {
    lat: number;
    lng: number;
}

export interface UseDriverLocationOptions {
    /** Set to false to pause tracking (e.g. ride completed). Defaults to true. */
    isActive?: boolean;
}

export interface UseDriverLocationResult {
    /** True if the user denied location permission. Show an alert/UI. */
    permissionDenied: boolean;
    /** Most recent GPS fix. null until first fix arrives. */
    currentLocation: DriverLatLng | null;
    /** Non-null if an error occurred starting the watcher. */
    locationError: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDriverLocation(
    { isActive = true }: UseDriverLocationOptions = {}
): UseDriverLocationResult {
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<DriverLatLng | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Ref to the active Location subscription so we can remove it on cleanup
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
    // Timestamp of the last successful socket emit (client-side throttle)
    const lastEmitRef = useRef<number>(0);

    // ── Emit helper (throttled) ───────────────────────────────────────────────
    const tryEmit = useCallback((lat: number, lng: number) => {
        const now = Date.now();
        if (now - lastEmitRef.current < CLIENT_THROTTLE_MS) return;
        if (!isSocketConnected()) return; // silent skip when offline; server handles reconnect

        lastEmitRef.current = now;
        emitLocationUpdate(lat, lng);
    }, []);

    // ── Stop watcher helper ───────────────────────────────────────────────────
    const stopWatcher = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
    }, []);

    // ── Main effect ───────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function startTracking() {
            // 1. Request foreground permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (cancelled) return; // component unmounted while awaiting

            if (status !== "granted") {
                setPermissionDenied(true);
                setLocationError("Location permission denied. Enable it in Settings to track your position.");
                return;
            }

            setPermissionDenied(false);
            setLocationError(null);

            if (!isActive) return; // permission granted but tracking paused

            // 2. Start continuous watch
            try {
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: LOCATION_ACCURACY,
                        distanceInterval: DISTANCE_INTERVAL_M,
                        timeInterval: CLIENT_THROTTLE_MS,
                    },
                    (locationObj) => {
                        if (cancelled) return;
                        const { latitude: lat, longitude: lng } = locationObj.coords;
                        setCurrentLocation({ lat, lng });
                        tryEmit(lat, lng);
                    }
                );

                if (cancelled) {
                    sub.remove(); // unmounted between await and assignment
                    return;
                }

                subscriptionRef.current = sub;
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : "Failed to start location tracking";
                    setLocationError(msg);
                    console.error("[useDriverLocation] watchPositionAsync error:", err);
                }
            }
        }

        startTracking();

        return () => {
            cancelled = true;
            stopWatcher();
        };
    }, [isActive, tryEmit, stopWatcher]);

    return { permissionDenied, currentLocation, locationError };
}
