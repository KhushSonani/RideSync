/**
 * @file live-tracking.tsx
 * @description Rider's live tracking screen.
 *
 * Shows a real MapView with:
 *   - Rider marker at the pickup location (static)
 *   - Driver marker that updates in real time via the driver:location_update socket event
 *
 * Socket events consumed:
 *   - driver:location_update  → move driver marker
 *   - ride:status_updated     → update rideStatus (arriving → started)
 *   - ride:completed          → navigate to ride-complete screen
 *   - ride:cancelled          → navigate back to home
 *
 * All listeners are registered exactly once and cleaned up on unmount.
 * No polling. No new socket instance created.
 */

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RideStatusCard, { type RideStatus } from "@/components/ride/RideStatusCard";
import DriverInfoCard from "@/components/ride/DriverInfoCard";
import RouteRow from "@/components/ride/RouteRow";
import {
    onDriverLocation,
    onRideStatusUpdated,
    onRideCompleted,
    onRideCancelled,
    isSocketConnected,
} from "@/services/socket";
import type { RideAcceptedPayload, DriverLocationPayload } from "@/services/socket.types";

import { api } from "@/services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build an initial MapView region centred between pickup and the driver's
 * starting location (or just the pickup if no driver fix yet).
 */
function buildInitialRegion(
    pickupLat: number,
    pickupLng: number,
    driverLat: number | null,
    driverLng: number | null
): Region {
    const lat2 = driverLat ?? pickupLat;
    const lng2 = driverLng ?? pickupLng;

    const centreLat = (pickupLat + lat2) / 2;
    const centreLng = (pickupLng + lng2) / 2;
    const latDelta = Math.max(Math.abs(pickupLat - lat2) * 1.5, 0.02);
    const lngDelta = Math.max(Math.abs(pickupLng - lng2) * 1.5, 0.02);

    return { latitude: centreLat, longitude: centreLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LiveTrackingScreen() {
    const [rideData, setRideData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [rideStatus, setRideStatus] = useState<RideStatus>("arriving");
    const [cancelling, setCancelling] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // Driver location — starts null until first socket event arrives
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [hasFirstFix, setHasFirstFix] = useState(false);

    const mapRef = useRef<MapView>(null);

    // ── Fetch active ride on mount ────────────────────────────────────────────
    useEffect(() => {
        const fetchRide = async () => {
            try {
                const res = await api.get("/rides/current");
                if (res.data?.data) {
                    setRideData(res.data.data);
                    if (res.data.data.status === "arriving" || res.data.data.status === "started") {
                        setRideStatus(res.data.data.status);
                    }
                } else {
                    router.replace("/(rider)/home");
                }
            } catch (error) {
                console.error("[LiveTracking] Error fetching ride:", error);
                router.replace("/(rider)/home");
            } finally {
                setLoading(false);
            }
        };
        fetchRide();
    }, []);

    // ── Check socket health on mount ──────────────────────────────────────────
    useEffect(() => {
        const connected = isSocketConnected();
        setIsOffline(!connected);
    }, []);

    // ── Socket subscriptions ──────────────────────────────────────────────────
    useEffect(() => {
        if (!rideData) return;
        // Guard: socket might not be ready if screen is opened directly during dev
        let offDriverLocation: (() => void) | null = null;
        let offStatusUpdated: (() => void) | null = null;
        let offCompleted: (() => void) | null = null;
        let offCancelled: (() => void) | null = null;

        try {
            // 1. Driver location updates
            offDriverLocation = onDriverLocation((payload: DriverLocationPayload) => {
                const { lat, lng } = payload.location;

                // Gracefully handle missing / invalid coordinates
                if (typeof lat !== "number" || typeof lng !== "number") {
                    console.warn("[LiveTracking] Received invalid driver location:", payload);
                    return;
                }

                setDriverLocation({ lat, lng });
                setIsOffline(false);

                if (!hasFirstFix) {
                    setHasFirstFix(true);
                    // Animate camera to show both markers on first fix
                    mapRef.current?.animateToRegion(
                        buildInitialRegion(rideData.pickup.location.coordinates[1], rideData.pickup.location.coordinates[0], lat, lng),
                        800
                    );
                } else {
                    // Smoothly pan camera to keep driver marker visible
                    mapRef.current?.animateCamera(
                        { center: { latitude: lat, longitude: lng } },
                        { duration: 600 }
                    );
                }
            });

            // 2. Ride status transitions (arriving → started)
            offStatusUpdated = onRideStatusUpdated((payload) => {
                if (payload.status === "arriving" || payload.status === "started") {
                    setRideStatus(payload.status);
                }
            });

            // 3. Ride completed → go to completion screen
            offCompleted = onRideCompleted((payload) => {
                router.replace({
                    pathname: "/(rider)/ride-complete",
                    params: {
                        fare: payload.fare,
                        completedAt: payload.completedAt,
                        pickupAddress: rideData.pickup.address,
                        dropAddress: rideData.drop.address,
                        distance: rideData.distance,
                        driverName: rideData.driver.user.fullname
                    }
                });
            });

            // 4. Ride cancelled → go home
            offCancelled = onRideCancelled(() => {
                Alert.alert("Ride Cancelled", "Your ride has been cancelled.", [
                    { text: "OK", onPress: () => router.replace("/(rider)/home") },
                ]);
            });
        } catch (err) {
            console.error("[LiveTracking] Socket subscription error:", err);
            setIsOffline(true);
        }

        // Cleanup on unmount — prevents duplicate listeners and memory leaks
        return () => {
            offDriverLocation?.();
            offStatusUpdated?.();
            offCompleted?.();
            offCancelled?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rideData]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCancelRide = useCallback(() => {
        if (rideStatus === "started") return;
        Alert.alert(
            "Cancel Ride",
            "Your driver is already on the way. Are you sure?",
            [
                { text: "Keep Ride", style: "cancel" },
                {
                    text: "Cancel",
                    style: "destructive",
                    onPress: async () => {
                        setCancelling(true);
                        try {
                            if (rideData?._id) {
                                await api.post(`/rides/${rideData._id}/cancel`, {
                                    cancelReason: "rider_cancelled"
                                });
                            }
                            router.replace("/(rider)/home");
                        } catch (err: any) {
                            setCancelling(false);
                            Alert.alert("Error", err.response?.data?.message || "Failed to cancel ride.");
                        }
                    },
                },
            ]
        );
    }, [rideStatus]);

    const handleCallDriver = useCallback(() => {
        // TODO: deep-link to phone dialler
    }, []);

    const handleMessageDriver = useCallback(() => {
        // TODO: open in-app chat
    }, []);

    // ── Status-dependent subtitle ─────────────────────────────────────────────
    const statusSubtitle =
        rideStatus === "arriving"
            ? "Your driver is heading to the pickup point"
            : "Sit back and enjoy your ride";

    if (loading || !rideData) {
        return (
            <View className="flex-1 bg-[#131D2B] items-center justify-center">
                <ActivityIndicator size="large" color="#11E0C5" />
            </View>
        );
    }

    const ride = rideData;
    const pickupLng = ride.pickup.location.coordinates[0];
    const pickupLat = ride.pickup.location.coordinates[1];

    // ── Map initial region (fallback to pickup until driver fix) ──────────────
    const initialRegion = buildInitialRegion(pickupLat, pickupLng, null, null);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-[#131D2B] relative">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── LIVE MAP ─────────────────────────────────────────────────── */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                initialRegion={initialRegion}
                mapType="standard"
                showsUserLocation={false}
                showsCompass={false}
                showsScale={false}
                toolbarEnabled={false}
                customMapStyle={DARK_MAP_STYLE}
            >
                {/* Rider / Pickup marker */}
                <Marker
                    coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                    title="Pickup"
                    description={ride.pickup.address}
                    pinColor="#11E0C5"
                    identifier="pickup-marker"
                />

                {/* Drop-off marker */}
                <Marker
                    coordinate={{
                        latitude: ride.drop.location.coordinates[1],
                        longitude: ride.drop.location.coordinates[0],
                    }}
                    title="Drop-off"
                    description={ride.drop.address}
                    pinColor="#EF4444"
                    identifier="dropoff-marker"
                />

                {/* Driver marker — only renders once we have a real location */}
                {driverLocation && (
                    <Marker
                        coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                        title={ride.driver.user.fullname}
                        description="Your driver"
                        identifier="driver-marker"
                    >
                        {/* Custom car icon */}
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#11E0C5",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2,
                                borderColor: "#fff",
                                shadowColor: "#11E0C5",
                                shadowOpacity: 0.8,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                        >
                            <Ionicons name="car-sport" size={20} color="#071018" />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* ── Waiting-for-first-fix overlay ─────────────────────────── */}
            {!hasFirstFix && (
                <View
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(7,11,18,0.55)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <ActivityIndicator size="large" color="#11E0C5" />
                    <Text style={{ color: "#748096", marginTop: 12, fontSize: 13, fontWeight: "600" }}>
                        Locating your driver…
                    </Text>
                </View>
            )}

            {/* ── Offline banner ────────────────────────────────────────── */}
            {isOffline && (
                <SafeAreaView className="absolute top-0 left-0 right-0 z-20">
                    <View className="mx-4 mt-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-xl flex-row items-center">
                        <Feather name="wifi-off" size={13} color="#EF4444" />
                        <Text className="text-red-400 text-[11px] font-semibold ml-2">
                            Connection lost — reconnecting…
                        </Text>
                    </View>
                </SafeAreaView>
            )}

            {/* ── Back button ───────────────────────────────────────────── */}
            <SafeAreaView className="absolute top-4 left-4 z-10">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-[#0D1420]/90 border border-white/10 items-center justify-center shadow-lg"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={18} color="white" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* ── Driver location badge (top-right) ─────────────────────── */}
            <SafeAreaView className="absolute top-4 right-4 z-10">
                <View className="bg-[#0D1420]/90 border border-white/10 px-3 py-1.5 rounded-xl">
                    <Text className="text-[#748096] text-[9px] uppercase tracking-wider">
                        Driver Location
                    </Text>
                    {driverLocation ? (
                        <Text className="text-[#11E0C5] text-[10px] font-semibold mt-0.5">
                            {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                        </Text>
                    ) : (
                        <Text className="text-[#748096] text-[10px] mt-0.5">Waiting…</Text>
                    )}
                </View>
            </SafeAreaView>

            {/* ── BOTTOM SLIDE-UP CARD ──────────────────────────────────── */}
            <View className="absolute bottom-0 left-0 right-0 z-10">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                    bounces={false}
                >
                    {/* Status badge */}
                    <View className="mb-3">
                        <RideStatusCard status={rideStatus} subtitle={statusSubtitle} />
                    </View>

                    <View
                        className={`${glassCard} p-5`}
                        style={{
                            shadowColor: "#000",
                            shadowOpacity: 0.4,
                            shadowRadius: 24,
                            elevation: 20,
                        }}
                    >
                        {/* ETA row */}
                        <View className="flex-row items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                            <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={16} color="#748096" />
                                <View className="ml-2">
                                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider">
                                        ETA
                                    </Text>
                                    <Text className="text-white text-[17px] font-bold mt-0.5">
                                        ~{rideStatus === "arriving" ? "5 min" : "12 min"}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <Ionicons name="navigate-outline" size={16} color="#748096" />
                                <View className="ml-2">
                                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider">
                                        Distance
                                    </Text>
                                    <Text className="text-[#11E0C5] text-[17px] font-bold mt-0.5">
                                        {ride.distance?.toFixed(1)} km
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Driver info */}
                        <View className="mb-4">
                            <DriverInfoCard
                                driver={rideData.driver}
                                onCallPress={handleCallDriver}
                                onMessagePress={handleMessageDriver}
                            />
                        </View>

                        {/* Route */}
                        <View className="border-t border-white/[0.05] pt-4 mb-5">
                            <RouteRow pickup={ride.pickup} drop={ride.drop} />
                        </View>

                        {/* Cancel / in-progress banner */}
                        {rideStatus !== "started" ? (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleCancelRide}
                                disabled={cancelling}
                                className="h-12 bg-red-500/10 border border-red-500/20 rounded-xl items-center justify-center"
                                accessibilityLabel="Cancel ride"
                            >
                                {cancelling ? (
                                    <ActivityIndicator size="small" color="#EF4444" />
                                ) : (
                                    <Text className="text-red-400 text-[13px] font-bold">
                                        Cancel Ride
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View className="flex-row items-center justify-center py-2 bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl">
                                <Ionicons name="car-sport" size={16} color="#10B981" />
                                <Text className="text-[#10B981] text-[13px] font-bold ml-2">
                                    Ride in progress — enjoy your trip!
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// ─── Dark map style ───────────────────────────────────────────────────────────
// Applied via customMapStyle prop (Android + iOS with PROVIDER_DEFAULT)

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
