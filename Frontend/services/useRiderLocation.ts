/**
 * @file useRiderLocation.ts
 * @description One-shot GPS hook for rider screens.
 *
 * Unlike useDriverLocation (which continuously watches + emits socket events),
 * this hook:
 *  - Requests foreground permission once
 *  - Gets a single GPS fix via getCurrentPositionAsync
 *  - Optionally reverse-geocodes the fix to a human-readable address
 *  - Does NOT start a continuous position watcher
 *  - Does NOT emit any socket events
 *
 * Usage (map centering only):
 *   const { coords, permissionDenied } = useRiderLocation();
 *
 * Usage (auto-set pickup with address):
 *   const { coords, address, loading } = useRiderLocation({ reverseGeocode: true });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";

// ─── Constants ────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiderCoords {
    lat: number;
    lng: number;
}

export interface UseRiderLocationOptions {
    /**
     * If true, calls the Google Reverse Geocoding API to convert the GPS fix
     * into a human-readable street address. Defaults to false.
     */
    reverseGeocode?: boolean;
}

export interface UseRiderLocationResult {
    /** Most recent GPS fix. null until the first fix arrives. */
    coords: RiderCoords | null;
    /** Human-readable address from reverse geocoding. Only populated when reverseGeocode=true. */
    address: string | null;
    /** True if the user denied location permission. */
    permissionDenied: boolean;
    /** True while the GPS fix (and optional reverse geocode) is in progress. */
    loading: boolean;
    /** Non-null string if something went wrong. */
    error: string | null;
    /** Call to re-fetch (e.g. user taps Retry after an error). */
    refresh: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function doReverseGeocode(lat: number, lng: number): Promise<string> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", GMAPS_KEY);
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Reverse geocoding error: ${res.status}`);
    const data = await res.json();

    return (
        data.results?.[0]?.formatted_address ??
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRiderLocation(
    { reverseGeocode = false }: UseRiderLocationOptions = {}
): UseRiderLocationResult {
    const [coords, setCoords] = useState<RiderCoords | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Guard against state updates after unmount
    const mountedRef = useRef(true);

    const fetchLocation = useCallback(async () => {
        if (!mountedRef.current) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Request permission (OS caches the answer after first grant)
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (!mountedRef.current) return;

            if (status !== "granted") {
                setPermissionDenied(true);
                setError("Location permission denied. Enable it in Settings to continue.");
                return;
            }

            setPermissionDenied(false);

            // 2. One-shot GPS fix
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            if (!mountedRef.current) return;

            const { latitude: lat, longitude: lng } = loc.coords;
            setCoords({ lat, lng });

            // 3. Optional reverse geocode (non-fatal if it fails)
            if (reverseGeocode) {
                try {
                    const addr = await doReverseGeocode(lat, lng);
                    if (mountedRef.current) setAddress(addr);
                } catch {
                    // Coords are still valid — address stays null
                }
            }
        } catch (err: unknown) {
            if (mountedRef.current) {
                setError("Could not detect your location. Please try again.");
                console.error("[useRiderLocation]", err);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [reverseGeocode]);

    useEffect(() => {
        mountedRef.current = true;
        fetchLocation();
        return () => { mountedRef.current = false; };
    }, [fetchLocation]);

    return { coords, address, permissionDenied, loading, error, refresh: fetchLocation };
}
