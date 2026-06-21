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
    AppState,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RideStatusCard, { type RideStatus } from "@/components/ride/RideStatusCard";
import DriverInfoCard from "@/components/ride/DriverInfoCard";
import RouteRow from "@/components/ride/RouteRow";
import OTPDisplay from "@/components/ride/OTPDisplay";
import {
    onDriverLocation,
    onRideStatusUpdated,
    onRideCompleted,
    onRideCancelled,
    isSocketConnected,
    connectSocket,
    onSocketConnect,
    onSocketDisconnect,
} from "@/services/socket";
import type { RideAcceptedPayload, DriverLocationPayload } from "@/services/socket.types";
import { getAccessToken } from "@/services/storage";

import { api } from "@/services/api";
import { useTheme } from "@/store/ThemeContext";

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
    const { colorScheme, theme } = useTheme();
    const [rideData, setRideData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [rideStatus, setRideStatus] = useState<RideStatus>("arriving");
    const [cancelling, setCancelling] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // Driver location — starts null until first socket event arrives
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [hasFirstFix, setHasFirstFix] = useState(false);
    const hasFirstFixRef = useRef(false);

    const mapRef = useRef<MapView>(null);

    // ── Listener refs — prevent stale-closure in AppState handler ────────────
    const offDriverLocationRef = useRef<(() => void) | undefined>(undefined);
    const offStatusUpdatedRef  = useRef<(() => void) | undefined>(undefined);
    const offCompletedRef      = useRef<(() => void) | undefined>(undefined);
    const offCancelledRef      = useRef<(() => void) | undefined>(undefined);

    // ── Check socket health ──────────────────────────────────────────
    useEffect(() => {
        setIsOffline(!isSocketConnected());
        let offConnect: (() => void) | undefined;
        let offDisconnect: (() => void) | undefined;
        let isActive = true;

        const setupHealth = async () => {
            const token = await getAccessToken();
            if (token && isActive) {
                try { connectSocket(token); } catch(e) { console.log("Socket connect error:", e); }
                offConnect = onSocketConnect(() => setIsOffline(false));
                offDisconnect = onSocketDisconnect(() => setIsOffline(true));
            }
        };
        setupHealth();

        return () => {
            isActive = false;
            if (offConnect) offConnect();
            if (offDisconnect) offDisconnect();
        };
    }, []);

    // ── State Recovery & Socket Subscriptions ─────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const setupState = async () => {
                try {
                    setLoading(true);
                    const res = await api.get("/rides/current");
                    if (!isActive) return;

                    const ride = res.data?.data;
                    if (ride) {
                        setRideData(ride);

                        if (ride.status === "arriving" || ride.status === "started") {
                            setRideStatus(ride.status);
                        } else if (ride.status === "completed") {
                            router.replace({
                                pathname: "/(rider)/ride-complete",
                                params: { rideId: ride._id }
                            });
                            return;
                        } else if (ride.status === "cancelled") {
                            Alert.alert("Ride Cancelled", "Your ride has been cancelled.");
                            router.replace("/(rider)/home");
                            return;
                        } else if (ride.status === "accepted") {
                            router.replace({
                                pathname: "/(rider)/driver-assigned",
                                params: { otp: ride.otp || "" }
                            });
                            return;
                        }

                        if (ride.driver?.location?.coordinates?.length === 2) {
                            const [lng, lat] = ride.driver.location.coordinates;
                            if (lat !== 0 || lng !== 0) {
                                setDriverLocation({ lat, lng });
                                if (!hasFirstFixRef.current) {
                                    hasFirstFixRef.current = true;
                                    setHasFirstFix(true);
                                    mapRef.current?.animateToRegion(
                                        buildInitialRegion(ride.pickup.location.coordinates[1], ride.pickup.location.coordinates[0], lat, lng),
                                        800
                                    );
                                }
                            }
                        }

                        // Socket setup
                        const token = await getAccessToken();
                        if (token && isActive) {
                            connectSocket(token);

                            // Clean up previous listeners — refs ensure we see current values
                            if (offDriverLocationRef.current) offDriverLocationRef.current();
                            if (offStatusUpdatedRef.current)  offStatusUpdatedRef.current();
                            if (offCompletedRef.current)      offCompletedRef.current();
                            if (offCancelledRef.current)      offCancelledRef.current();

                            offDriverLocationRef.current = onDriverLocation((payload: DriverLocationPayload) => {
                                const { lat, lng } = payload.location;
                                if (typeof lat !== "number" || typeof lng !== "number") return;

                                setDriverLocation({ lat, lng });

                                if (!hasFirstFixRef.current) {
                                    hasFirstFixRef.current = true;
                                    setHasFirstFix(true);
                                    mapRef.current?.animateToRegion(
                                        buildInitialRegion(ride.pickup.location.coordinates[1], ride.pickup.location.coordinates[0], lat, lng),
                                        800
                                    );
                                } else {
                                    mapRef.current?.animateCamera(
                                        { center: { latitude: lat, longitude: lng } },
                                        { duration: 600 }
                                    );
                                }
                            });

                            offStatusUpdatedRef.current = onRideStatusUpdated((payload) => {
                                if (payload.status === "arriving" || payload.status === "started") {
                                    setRideStatus(payload.status);
                                }
                            });

                            offCompletedRef.current = onRideCompleted((payload) => {
                                router.replace({
                                    pathname: "/(rider)/ride-complete",
                                    params: { rideId: payload._id }
                                });
                            });

                            offCancelledRef.current = onRideCancelled((payload) => {
                                if (payload.cancelledBy === "rider") return;
                                Alert.alert("Ride Cancelled", "Your ride has been cancelled.", [
                                    { text: "OK", onPress: () => router.replace("/(rider)/home") },
                                ]);
                            });
                        }
                    } else {
                        router.replace("/(rider)/home");
                        return;
                    }
                } catch (error) {
                    console.error("[LiveTracking] Recovery error:", error);
                    router.replace("/(rider)/home");
                } finally {
                    if (isActive) setLoading(false);
                }
            };

            setupState();

            const subscription = AppState.addEventListener("change", (nextAppState) => {
                if (nextAppState === "active") {
                    setupState();
                }
            });

            return () => {
                isActive = false;
                subscription.remove();
                if (offDriverLocationRef.current) offDriverLocationRef.current();
                if (offStatusUpdatedRef.current)  offStatusUpdatedRef.current();
                if (offCompletedRef.current)      offCompletedRef.current();
                if (offCancelledRef.current)      offCancelledRef.current();
                offDriverLocationRef.current = undefined;
                offStatusUpdatedRef.current  = undefined;
                offCompletedRef.current      = undefined;
                offCancelledRef.current      = undefined;
            };
        }, [])
    );

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
                            router.push("/(rider)/home");
                            setTimeout(() => setCancelling(false), 500);
                        } catch (err: any) {
                            setCancelling(false);
                            Alert.alert("Error", err.response?.data?.message || "Failed to cancel ride.");
                        }
                    },
                },
            ]
        );
        // MED-4: include rideData so closure always sees the current ride ID.
        // rideData._id is immutable per ride, but this is required for correctness.
    }, [rideStatus, rideData]);

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
            <View className="flex-1 bg-input items-center justify-center">
                <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <View className="flex-1 bg-input relative">
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
                customMapStyle={colorScheme === 'light' ? [] : DARK_MAP_STYLE}
            >
                {/* Rider / Pickup marker */}
                <Marker
                    coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                    title="Pickup"
                    description={ride.pickup.address}
                    pinColor={theme.colors.primary}
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
                                backgroundColor: theme.colors.primary,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2,
                                borderColor: "#fff",
                                shadowColor: theme.colors.primary,
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
                        backgroundColor: theme.colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ color: "#748096", marginTop: 12, fontSize: 13, fontWeight: "600" }}>
                        Locating your driver…
                    </Text>
                </View>
            )}

            {/* ── Offline banner ────────────────────────────────────────── */}
            {isOffline && (
                <SafeAreaView className="absolute top-0 left-0 right-0 z-20">
                    <View className="mx-4 mt-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-xl flex-row items-center">
                        <Feather name="wifi-off" size={13} color={theme.colors.danger} />
                        <Text className="text-red-400 text-[11px] font-semibold ml-2">
                            Connection lost — reconnecting…
                        </Text>
                    </View>
                </SafeAreaView>
            )}

            {/* ── Back button — LOW-4: disabled during an active ride to prevent
                 the rider from escaping the tracking screen mid-trip. ───────── */}
            <SafeAreaView className="absolute top-4 left-4 z-10">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    disabled={rideStatus === "arriving" || rideStatus === "started"}
                    className="w-10 h-10 rounded-full bg-card/90 border border-border items-center justify-center shadow-lg"
                    style={{ opacity: (rideStatus === "arriving" || rideStatus === "started") ? 0.3 : 1 }}
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={18} color="white" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* ── Driver location badge (top-right) ─────────────────────── */}
            <SafeAreaView className="absolute top-4 right-4 z-10">
                <View className="bg-card/90 border border-border px-3 py-1.5 rounded-xl">
                    <Text className="text-muted text-[9px] uppercase tracking-wider">
                        Driver Location
                    </Text>
                    {driverLocation ? (
                        <Text className="text-primary text-[10px] font-semibold mt-0.5">
                            {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                        </Text>
                    ) : (
                        <Text className="text-muted text-[10px] mt-0.5">Waiting…</Text>
                    )}
                </View>
            </SafeAreaView>

            {/* ── BOTTOM SLIDE-UP CARD ──────────────────────────────────── */}
            <View 
                className="absolute bottom-0 left-0 right-0 z-10 bg-background/95 border-t border-border rounded-t-[32px] pt-3"
                style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.6,
                    shadowRadius: 32,
                    elevation: 24,
                }}
            >
                {/* Drag handle line */}
                <View className="w-12 h-1 bg-foreground/20 rounded-full self-center mb-3" />
                
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                    bounces={false}
                >
                    {/* Status badge */}
                    <View className="mb-3">
                        <RideStatusCard status={rideStatus} subtitle={statusSubtitle} />
                    </View>

                    <View className={`${glassCard} p-5`}>
                        {/* ETA row */}
                        <View className="flex-row items-center justify-between border-b border-border pb-4 mb-4">
                            <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                                <View className="ml-2">
                                    <Text className="text-muted text-[10px] uppercase tracking-wider">
                                        ETA
                                    </Text>
                                    <Text className="text-foreground text-[17px] font-bold mt-0.5">
                                        ~{rideStatus === "arriving" ? "5 min" : "12 min"}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <Ionicons name="navigate-outline" size={16} color={theme.colors.textMuted} />
                                <View className="ml-2">
                                    <Text className="text-muted text-[10px] uppercase tracking-wider">
                                        Distance
                                    </Text>
                                    <Text className="text-primary text-[17px] font-bold mt-0.5">
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

                        {/* OTP Card (Visible if arriving and OTP exists) */}
                        {rideStatus === "arriving" && rideData.otp && (
                            <View className="mb-4">
                                <OTPDisplay otp={rideData.otp} />
                            </View>
                        )}

                        {/* Route */}
                        <View className="border-t border-border pt-4 mb-5">
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
                                    <ActivityIndicator size="small" color={theme.colors.danger} />
                                ) : (
                                    <Text className="text-red-400 text-[13px] font-bold">
                                        Cancel Ride
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View className="flex-row items-center justify-center py-2 bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl">
                                <Ionicons name="car-sport" size={16} color={theme.colors.success} />
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
