/**
 * @file useRouteInfo.ts
 * @description Reactive hook that computes real route distance, duration, and fare
 * from the Google Directions API whenever pickup or drop coordinates change.
 *
 * Fare formula: ₹30 base + ₹22 per km (standard Indian auto/cab rate).
 * The computed `fare` and `distanceKm` values are sent directly to
 * POST /api/v1/rides/create — the backend stores them as-is.
 *
 * The hook also decodes Google's encoded overview polyline for rendering
 * a Polyline overlay on MapView.
 *
 * Re-runs reactively on coord changes. Cancels in-flight requests via AbortController.
 */

import { useState, useEffect, useRef } from "react";
import type { LatLng } from "@/store/LocationContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

/** ₹ base fare applied regardless of distance */
const BASE_FARE = 30;
/** ₹ charged per kilometre */
const PER_KM_RATE = 22;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteInfo {
    distanceM: number;    // raw metres
    distanceKm: number;   // rounded to 1 decimal
    durationSec: number;  // raw seconds
    durationMin: number;  // ceiling minutes (for display)
    fare: number;         // ₹ rounded to nearest integer
    /** Decoded polyline coordinates for react-native-maps <Polyline /> */
    polyline: Array<{ latitude: number; longitude: number }>;
}

export interface UseRouteInfoResult {
    routeInfo: RouteInfo | null;
    loading: boolean;
    error: string | null;
}

// ─── Polyline decoder ─────────────────────────────────────────────────────────
// Implements Google's encoded polyline algorithm:
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm

function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let b: number;
        let shift = 0;
        let result = 0;

        // Decode latitude delta
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0;
        result = 0;

        // Decode longitude delta
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return points;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRouteInfo(
    pickup: LatLng | null,
    drop: LatLng | null
): UseRouteInfoResult {
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Both coords required — reset if either is missing
        if (!pickup || !drop) {
            abortRef.current?.abort();
            setRouteInfo(null);
            setError(null);
            setLoading(false);
            return;
        }

        // Cancel any previous in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        (async () => {
            try {
                const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
                url.searchParams.set("origin", `${pickup.lat},${pickup.lng}`);
                url.searchParams.set("destination", `${drop.lat},${drop.lng}`);
                url.searchParams.set("key", GMAPS_KEY);

                const res = await fetch(url.toString(), { signal: controller.signal });
                if (!res.ok) throw new Error(`Directions API error: ${res.status}`);

                const data = await res.json();

                if (data.status !== "OK") {
                    throw new Error(
                        `Directions: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`
                    );
                }

                const leg = data.routes?.[0]?.legs?.[0];
                if (!leg) throw new Error("No route returned from Directions API");

                const distanceM: number = leg.distance.value;
                const distanceKm = parseFloat((distanceM / 1000).toFixed(1));
                const durationSec: number = leg.duration.value;
                const durationMin = Math.ceil(durationSec / 60);
                const fare = Math.round(BASE_FARE + distanceKm * PER_KM_RATE);
                const polyline = decodePolyline(
                    data.routes[0].overview_polyline.points as string
                );

                setRouteInfo({ distanceM, distanceKm, durationSec, durationMin, fare, polyline });
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") return;
                setError("Could not calculate route. Check your connection and try again.");
                console.error("[useRouteInfo]", err);
            } finally {
                setLoading(false);
            }
        })();

        return () => { controller.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

    return { routeInfo, loading, error };
}
