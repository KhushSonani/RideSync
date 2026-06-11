/**
 * @file create-ride.tsx
 * @description Rider create-ride screen — Uber/Ola-style with live map.
 *
 * Layout:
 *   MapView (absolute, full screen)
 *     └ Pickup marker (teal) — when pickup.coords is set
 *     └ Drop marker (red) — when drop.coords is set
 *     └ Route Polyline (teal) — when both coords set + route fetched
 *   Back button (absolute, top-left)
 *   Bottom card (absolute, bottom-0)
 *     └ Pickup + Drop inputs (LocationSearchInput — existing component)
 *     └ Swap button
 *     └ Route / Fare card — visible when both coords set
 *     └ Confirm Ride button → POST /api/v1/rides/create
 *     └ Error banner (inline)
 *
 * GPS auto-set:
 *   On mount, if pickup has no coords, useRiderLocation (reverseGeocode=true)
 *   auto-populates pickup address + coords from the device GPS.
 *   This implements "Default pickup = current location."
 *
 * Real fare + distance:
 *   useRouteInfo calls the Google Directions API and returns distanceKm,
 *   durationMin, fare. These values are sent directly to the backend.
 *
 * Map interactions:
 *   - Pickup only: camera centres on pickup
 *   - Both set: fitToCoordinates to show full route
 *   - Swap: re-fits after coordinates flip
 */

import React, {
    useState,
    useCallback,
    useEffect,
    useRef,
} from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Alert,
} from "react-native";
import MapView, {
    Marker,
    Polyline,
    PROVIDER_DEFAULT,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { api } from "@/services/api";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import LocationSearchInput from "@/components/ride/LocationSearchInput";
import { useLocation } from "@/store/LocationContext";
import { useRiderLocation } from "@/services/useRiderLocation";
import { useRouteInfo } from "@/services/useRouteInfo";

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");
/** Bottom card height — leaves ~42% of screen visible as map */
const BOTTOM_CARD_MAX_H = Math.round(SCREEN_H * 0.58);
/** Bottom padding for fitToCoordinates — must account for the card height */
const MAP_BOTTOM_PAD = Math.round(SCREEN_H * 0.6);

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateRideScreen() {
    const { pickup, drop, setPickup, setDrop, clearLocations } = useLocation();
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const mapRef = useRef<MapView>(null);
    const autoSetDoneRef = useRef(false);

    // ── GPS auto-set (default pickup = current location) ─────────────────────
    const {
        coords: gpsCoords,
        address: gpsAddress,
        loading: gpsLoading,
    } = useRiderLocation({ reverseGeocode: true });

    useEffect(() => {
        // Only auto-set once, and only when pickup has not been chosen yet
        if (
            !autoSetDoneRef.current &&
            !pickup.coords &&
            gpsCoords &&
            gpsAddress
        ) {
            autoSetDoneRef.current = true;
            setPickup({ address: gpsAddress, coords: gpsCoords });
        }
    }, [gpsCoords, gpsAddress, pickup.coords, setPickup]);

    // ── Route info (distance, duration, fare, polyline) ───────────────────────
    const { routeInfo, loading: routeLoading, error: routeError } = useRouteInfo(
        pickup.coords,
        drop.coords
    );

    // ── Map camera: fit to both markers when route is ready ──────────────────
    useEffect(() => {
        if (pickup.coords && drop.coords && routeInfo) {
            mapRef.current?.fitToCoordinates(
                [
                    { latitude: pickup.coords.lat, longitude: pickup.coords.lng },
                    { latitude: drop.coords.lat, longitude: drop.coords.lng },
                ],
                {
                    edgePadding: {
                        top: 80,
                        right: 40,
                        bottom: MAP_BOTTOM_PAD,
                        left: 40,
                    },
                    animated: true,
                }
            );
        } else if (pickup.coords && !drop.coords) {
            mapRef.current?.animateToRegion(
                {
                    latitude: pickup.coords.lat,
                    longitude: pickup.coords.lng,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                },
                700
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        pickup.coords?.lat,
        pickup.coords?.lng,
        drop.coords?.lat,
        drop.coords?.lng,
        !!routeInfo,
    ]);

    // ── Derived state ─────────────────────────────────────────────────────────

    const canCreate =
        pickup.address.trim().length > 0 &&
        drop.address.trim().length > 0 &&
        !!pickup.coords &&
        !!drop.coords &&
        !!routeInfo &&
        !creating;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handlePickupPress = useCallback(() => {
        router.push("/location-search?type=pickup");
    }, []);

    const handleDropPress = useCallback(() => {
        router.push("/location-search?type=drop");
    }, []);

    const handleSwapLocations = useCallback(() => {
        const prev = { ...pickup };
        setPickup({ ...drop });
        setDrop(prev);
    }, [pickup, drop, setPickup, setDrop]);

    const handleCreateRide = useCallback(async () => {
        if (!canCreate || !routeInfo) return;

        setCreating(true);
        setCreateError(null);

        try {
            await api.post("/rides/create", {
                pickup: {
                    address: pickup.address,
                    location: {
                        type: "Point",
                        coordinates: [pickup.coords!.lng, pickup.coords!.lat],
                    },
                },
                drop: {
                    address: drop.address,
                    location: {
                        type: "Point",
                        coordinates: [drop.coords!.lng, drop.coords!.lat],
                    },
                },
                fare: routeInfo.fare,
                distance: routeInfo.distanceKm,
            });

            clearLocations();
            router.replace("/(rider)/searching-driver");
        } catch (err: any) {
            const message =
                err?.response?.data?.message ??
                "Failed to create ride. Please try again.";
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    }, [canCreate, routeInfo, pickup, drop, clearLocations]);

    // ── Initial map region ────────────────────────────────────────────────────

    const initialRegion = pickup.coords
        ? {
              latitude: pickup.coords.lat,
              longitude: pickup.coords.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
          }
        : {
              latitude: 20.5937,
              longitude: 78.9629,
              latitudeDelta: 18,
              longitudeDelta: 18,
          };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={{ flex: 1, backgroundColor: "#070B12" }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── FULL SCREEN MAP ───────────────────────────────────────── */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                initialRegion={initialRegion}
                showsCompass={false}
                showsScale={false}
                toolbarEnabled={false}
                customMapStyle={DARK_MAP_STYLE}
            >
                {/* Pickup marker */}
                {pickup.coords && (
                    <Marker
                        coordinate={{
                            latitude: pickup.coords.lat,
                            longitude: pickup.coords.lng,
                        }}
                        title="Pickup"
                        description={pickup.address}
                        identifier="pickup-marker"
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: "#11E0C5",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2.5,
                                borderColor: "#fff",
                                shadowColor: "#11E0C5",
                                shadowOpacity: 0.7,
                                shadowRadius: 10,
                                elevation: 6,
                            }}
                        >
                            <Ionicons name="locate" size={16} color="#071018" />
                        </View>
                    </Marker>
                )}

                {/* Drop-off marker */}
                {drop.coords && (
                    <Marker
                        coordinate={{
                            latitude: drop.coords.lat,
                            longitude: drop.coords.lng,
                        }}
                        title="Drop-off"
                        description={drop.address}
                        identifier="dropoff-marker"
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: "#EF4444",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2.5,
                                borderColor: "#fff",
                                shadowColor: "#EF4444",
                                shadowOpacity: 0.7,
                                shadowRadius: 10,
                                elevation: 6,
                            }}
                        >
                            <Ionicons name="flag" size={15} color="#fff" />
                        </View>
                    </Marker>
                )}

                {/* Route polyline */}
                {routeInfo && routeInfo.polyline.length > 1 && (
                    <Polyline
                        coordinates={routeInfo.polyline}
                        strokeColor="#11E0C5"
                        strokeWidth={4}
                        lineDashPattern={undefined}
                        lineCap="round"
                        lineJoin="round"
                    />
                )}
            </MapView>

            {/* ── BACK BUTTON ───────────────────────────────────────────── */}
            <SafeAreaView
                style={{ position: "absolute", top: 0, left: 0, zIndex: 20 }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    accessibilityLabel="Go back"
                    style={{
                        marginTop: 12,
                        marginLeft: 16,
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: "rgba(7,11,18,0.90)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Feather name="arrow-left" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* ── ROUTE COMPUTING BADGE ─────────────────────────────────── */}
            {routeLoading && pickup.coords && drop.coords && (
                <View
                    style={{
                        position: "absolute",
                        top: 70,
                        alignSelf: "center",
                        zIndex: 15,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(7,11,18,0.88)",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.08)",
                        gap: 8,
                    }}
                >
                    <ActivityIndicator size={12} color="#11E0C5" />
                    <Text style={{ color: "#748096", fontSize: 12, fontWeight: "600" }}>
                        Calculating route…
                    </Text>
                </View>
            )}

            {/* ── BOTTOM CARD ───────────────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: BOTTOM_CARD_MAX_H,
                    zIndex: 10,
                    backgroundColor: "rgba(7,11,18,0.97)",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    shadowColor: "#000",
                    shadowOpacity: 0.5,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: -4 },
                    elevation: 24,
                }}
            >
                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 32 }}
                >
                    {/* Drag handle */}
                    <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 20 }}>
                        <View
                            style={{
                                width: 40,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: "rgba(255,255,255,0.15)",
                            }}
                        />
                    </View>

                    {/* Header */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                        <Text
                            style={{
                                color: "#748096",
                                fontSize: 11,
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                marginBottom: 4,
                            }}
                        >
                            Book a ride
                        </Text>
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 22,
                                fontWeight: "700",
                                letterSpacing: -0.3,
                            }}
                        >
                            Where to?
                        </Text>
                    </View>

                    {/* Location inputs */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                        <View style={{ position: "relative", gap: 12 }}>
                            {/* Pickup */}
                            <LocationSearchInput
                                label="Pickup"
                                placeholder="Search pickup location…"
                                value={pickup.address}
                                onPress={handlePickupPress}
                                dotColor="#11E0C5"
                                loading={gpsLoading && !pickup.coords}
                            />

                            {/* Connecting line */}
                            <View
                                style={{
                                    position: "absolute",
                                    left: 21,
                                    top: 72,
                                    height: 34,
                                    width: 1,
                                    backgroundColor: "rgba(255,255,255,0.1)",
                                }}
                            />

                            {/* Swap button */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleSwapLocations}
                                accessibilityLabel="Swap pickup and drop locations"
                                style={{
                                    position: "absolute",
                                    right: 16,
                                    top: 64,
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: "#131D2B",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.08)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="swap-vertical"
                                    size={16}
                                    color="#748096"
                                />
                            </TouchableOpacity>

                            {/* Drop */}
                            <LocationSearchInput
                                label="Destination"
                                placeholder="Search destination…"
                                value={drop.address}
                                onPress={handleDropPress}
                                dotColor="#EF4444"
                            />
                        </View>
                    </View>

                    {/* ── Route / Fare card ─────────────────────────────── */}
                    {(routeInfo || routeLoading || routeError) && pickup.coords && drop.coords && (
                        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                            <View
                                style={{
                                    backgroundColor: "#0D1420",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.07)",
                                    borderRadius: 20,
                                    padding: 18,
                                }}
                            >
                                {/* Card header */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 14,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 10,
                                            backgroundColor: "rgba(17,224,197,0.1)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginRight: 8,
                                        }}
                                    >
                                        <Feather name="tag" size={14} color="#11E0C5" />
                                    </View>
                                    <Text
                                        style={{
                                            color: "#748096",
                                            fontSize: 11,
                                            fontWeight: "600",
                                            textTransform: "uppercase",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        Fare Estimate
                                    </Text>
                                    {routeLoading && (
                                        <ActivityIndicator
                                            size={12}
                                            color="#748096"
                                            style={{ marginLeft: 8 }}
                                        />
                                    )}
                                </View>

                                {routeLoading && !routeInfo ? (
                                    // Skeleton while fetching
                                    <View style={{ gap: 8 }}>
                                        <View
                                            style={{
                                                height: 36,
                                                width: "50%",
                                                backgroundColor: "rgba(255,255,255,0.06)",
                                                borderRadius: 10,
                                            }}
                                        />
                                        <View
                                            style={{
                                                height: 16,
                                                width: "70%",
                                                backgroundColor: "rgba(255,255,255,0.04)",
                                                borderRadius: 8,
                                            }}
                                        />
                                    </View>
                                ) : routeError ? (
                                    <View
                                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                                    >
                                        <Feather name="alert-circle" size={14} color="#EF4444" />
                                        <Text style={{ color: "#EF4444", fontSize: 12, flex: 1 }}>
                                            {routeError}
                                        </Text>
                                    </View>
                                ) : routeInfo ? (
                                    // Real values
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <View>
                                            <Text
                                                style={{
                                                    color: "#FFFFFF",
                                                    fontSize: 30,
                                                    fontWeight: "700",
                                                    letterSpacing: -0.5,
                                                }}
                                            >
                                                ₹{routeInfo.fare}
                                            </Text>
                                            <Text style={{ color: "#748096", fontSize: 12, marginTop: 3 }}>
                                                Standard · {routeInfo.distanceKm} km
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: "flex-end", gap: 6 }}>
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                <Feather name="clock" size={12} color="#748096" />
                                                <Text style={{ color: "#748096", fontSize: 12 }}>
                                                    ~{routeInfo.durationMin} min
                                                </Text>
                                            </View>
                                            <View
                                                style={{
                                                    backgroundColor: "rgba(17,224,197,0.1)",
                                                    borderWidth: 1,
                                                    borderColor: "rgba(17,224,197,0.2)",
                                                    borderRadius: 20,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: "#11E0C5",
                                                        fontSize: 11,
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    Estimate
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    )}

                    {/* ── Ride type pill ────────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                        <View
                            style={{
                                backgroundColor: "#0D1420",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.07)",
                                borderRadius: 20,
                                padding: 14,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 14,
                                        backgroundColor: "rgba(17,224,197,0.1)",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: 12,
                                    }}
                                >
                                    <Ionicons name="car-sport" size={20} color="#11E0C5" />
                                </View>
                                <View>
                                    <Text
                                        style={{
                                            color: "#FFFFFF",
                                            fontSize: 14,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Standard
                                    </Text>
                                    <Text style={{ color: "#748096", fontSize: 11, marginTop: 2 }}>
                                        Affordable everyday ride
                                    </Text>
                                </View>
                            </View>
                            <View
                                style={{
                                    backgroundColor: "rgba(17,224,197,0.1)",
                                    borderWidth: 1,
                                    borderColor: "rgba(17,224,197,0.25)",
                                    borderRadius: 20,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#11E0C5",
                                        fontSize: 11,
                                        fontWeight: "700",
                                    }}
                                >
                                    Selected
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Error banner ──────────────────────────────────── */}
                    {createError && (
                        <View
                            style={{
                                marginHorizontal: 20,
                                marginBottom: 12,
                                backgroundColor: "rgba(239,68,68,0.1)",
                                borderWidth: 1,
                                borderColor: "rgba(239,68,68,0.25)",
                                borderRadius: 16,
                                padding: 14,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <Feather name="alert-circle" size={15} color="#EF4444" />
                            <Text
                                style={{ color: "#EF4444", fontSize: 13, flex: 1 }}
                            >
                                {createError}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setCreateError(null)}
                                accessibilityLabel="Dismiss error"
                            >
                                <Feather name="x" size={15} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Confirm Ride button ───────────────────────────── */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleCreateRide}
                            disabled={!canCreate}
                            accessibilityLabel="Confirm and request ride"
                            style={{
                                height: 56,
                                backgroundColor: "#11E0C5",
                                borderRadius: 20,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "rgba(111,255,239,0.1)",
                                opacity: canCreate ? 1 : 0.4,
                                shadowColor: "#11E0C5",
                                shadowOpacity: canCreate ? 0.35 : 0,
                                shadowRadius: 16,
                                shadowOffset: { width: 0, height: 6 },
                                elevation: canCreate ? 10 : 0,
                            }}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color="#071018" />
                            ) : (
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <Ionicons name="car-sport" size={18} color="#071018" />
                                    <Text
                                        style={{
                                            color: "#071018",
                                            fontSize: 16,
                                            fontWeight: "700",
                                        }}
                                    >
                                        {pickup.coords && drop.coords && !routeInfo && routeLoading
                                            ? "Calculating fare…"
                                            : "Confirm Ride"}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Helper text when locations not yet set */}
                        {(!pickup.coords || !drop.coords) && (
                            <Text
                                style={{
                                    color: "#748096",
                                    fontSize: 12,
                                    textAlign: "center",
                                    marginTop: 10,
                                }}
                            >
                                {!pickup.coords
                                    ? "Set your pickup location to continue"
                                    : "Set your destination to continue"}
                            </Text>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// ─── Dark map style ───────────────────────────────────────────────────────────

const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#0d1420" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0d1420" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#748096" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#a0a8b4" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#748096" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#0f1d2b" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3a4d60" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1a2840" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#111d2c" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#5a6a7e" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#243348" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1a2840" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#8a9aaa" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#14253a" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#748096" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#07111e" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3a4d60" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#07111e" }],
    },
];
