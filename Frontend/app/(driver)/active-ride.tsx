/**
* @file active-ride.tsx
* @description Driver's active ride screen.
*
* Integrates:
*   1. useDriverLocation — continuous GPS tracking + socket update_location emission
*   2. MapView — shows driver's current position and the pickup/drop-off route
*   3. Socket status listeners — ride:status_updated, ride:completed, ride:cancelled
*
* Socket events emitted (via useDriverLocation hook):
*   - update_location  { lat, lng }  — throttled at 2 500 ms client-side
*
* Socket events consumed:
*   - ride:status_updated → update local rideStatus state
*   - ride:completed      → stop tracking, navigate to ride-complete screen
*   - ride:cancelled      → stop tracking, navigate home
*
* Design rules followed:
*   - Uses existing getSocket() singleton — no new socket instance created
*   - Single useEffect per event set — no duplicate listeners
*   - All subscriptions cleaned up on unmount
*   - Tracking stops when ride completes or component unmounts
*/

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    AppState,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { api } from "@/services/api";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import RideStatusCard, { type RideStatus } from "@/components/ride/RideStatusCard";
import RiderInfoCard from "@/components/ride/RiderInfoCard";
import { useDriverLocation } from "@/services/useDriverLocation";
import {
    onRideStatusUpdated,
    onRideCompleted,
    onRideCancelled,
    connectSocket,
} from "@/services/socket";
import { getAccessToken } from "@/services/storage";
import type { RideAcceptedPayload } from "@/services/socket.types";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DriverActiveRide() {
    const [rideData, setRideData] = useState<RideAcceptedPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [rideStatus, setRideStatus] = useState<RideStatus>("accepted");
    const [cancelling, setCancelling] = useState(false);

    // isTrackingActive: flips to false on ride completion to stop GPS emissions
    const [isTrackingActive, setIsTrackingActive] = useState(true);

    const mapRef = useRef<MapView>(null);

    // ── Listener refs — prevent stale-closure in AppState handler ────────────
    const offStatusUpdatedRef = useRef<(() => void) | undefined>(undefined);
    const offCompletedRef = useRef<(() => void) | undefined>(undefined);
    const offCancelledRef = useRef<(() => void) | undefined>(undefined);

    // ── State Recovery & Socket Subscriptions ─────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const setupState = async () => {
                try {
                    setLoading(true);
                    const res = await api.get("/rides/current");
                    if (!isActive) return;

                    const currentRide = res.data?.data;
                    if (currentRide) {
                        setRideData({
                            ride: currentRide,
                            driver: currentRide.driver,
                        });
                        setRideStatus(currentRide.status);
                        setIsTrackingActive(true);

                        // If already completed or cancelled while away, fast-forward
                        if (currentRide.status === "completed") {
                            setIsTrackingActive(false);
                            router.replace({
                                pathname: "/(driver)/ride-complete",
                                params: {
                                    rideId: currentRide._id,
                                    fare: currentRide.fare,
                                    distance: currentRide.distance,
                                    pickupAddress: currentRide.pickup.address,
                                    dropAddress: currentRide.drop.address,
                                    completedAt: currentRide.completedAt || new Date().toISOString()
                                }
                            });
                            return;
                        } else if (currentRide.status === "cancelled") {
                            setIsTrackingActive(false);
                            Alert.alert("Ride Cancelled", "The rider cancelled this trip.");
                            router.replace("/(driver)/home");
                            return;
                        }

                        // Socket setup
                        const token = await getAccessToken();
                        if (token && isActive) {
                            connectSocket(token);

                            // Clean up previous listeners — refs ensure we see current values
                            if (offStatusUpdatedRef.current) offStatusUpdatedRef.current();
                            if (offCompletedRef.current) offCompletedRef.current();
                            if (offCancelledRef.current) offCancelledRef.current();

                            offStatusUpdatedRef.current = onRideStatusUpdated((payload) => {
                                if (payload.status === "arriving" || payload.status === "started") {
                                    setRideStatus(payload.status);
                                }
                            });

                            offCompletedRef.current = onRideCompleted((payload) => {
                                setIsTrackingActive(false);
                                router.replace({
                                    pathname: "/(driver)/ride-complete",
                                    params: {
                                        ride: JSON.stringify({
                                            ...currentRide,
                                            status: "completed",
                                            completedAt: payload.completedAt,
                                            fare: payload.fare
                                        })
                                    }
                                });
                            });

                            offCancelledRef.current = onRideCancelled((payload) => {
                                if (payload.cancelledBy === "driver") return;
                                setIsTrackingActive(false);
                                Alert.alert("Ride Cancelled", "The rider cancelled this trip.");
                                router.replace("/(driver)/home");
                            });
                        }
                    } else {
                        router.replace("/(driver)/home");
                        return;
                    }
                } catch (err) {
                    console.log("[ActiveRide] Recovery error:", err);
                    router.replace("/(driver)/home");
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
                if (offStatusUpdatedRef.current) offStatusUpdatedRef.current();
                if (offCompletedRef.current) offCompletedRef.current();
                if (offCancelledRef.current) offCancelledRef.current();
                offStatusUpdatedRef.current = undefined;
                offCompletedRef.current = undefined;
                offCancelledRef.current = undefined;
            };
        }, [])
    );

    // ── GPS tracking hook ─────────────────────────────────────────────────────
    const { permissionDenied, currentLocation, locationError } = useDriverLocation({
        isActive: isTrackingActive && !loading && !!rideData,
    });

    // Show permission denied alert once
    const permissionAlertShown = useRef(false);
    useEffect(() => {
        if (permissionDenied && !permissionAlertShown.current) {
            permissionAlertShown.current = true;
            Alert.alert(
                "Location Permission Required",
                "RideSync needs your location to update the rider. Please enable location access in Settings.",
                [{ text: "OK" }]
            );
        }
    }, [permissionDenied]);

    // Animate map camera to driver's current position as it changes
    useEffect(() => {
        if (!currentLocation) return;
        mapRef.current?.animateCamera(
            {
                center: {
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng,
                },
                zoom: 16,
            },
            { duration: 600 }
        );
    }, [currentLocation]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleMarkArriving = useCallback(async () => {
        if (!rideData) return;
        try {
            await api.post(`/rides/${rideData.ride._id}/arriving`);
            setRideStatus("arriving");
        } catch (err: any) {
            Alert.alert("Error", err.response?.data?.message || "Failed to mark arriving");
        }
    }, [rideData]);

    const handleOpenOTPVerify = useCallback(() => {
        if (!rideData) return;
        router.push({
            pathname: "/(driver)/otp-verify",
            params: { rideId: rideData.ride._id }
        });
    }, [rideData]);

    const handleCompleteRide = useCallback(async () => {
        if (!rideData) return;
        try {
            const res = await api.post(`/rides/${rideData.ride._id}/complete`);
            setIsTrackingActive(false);
            router.replace({
                pathname: "/(driver)/ride-complete",
                params: {
                    rideId: rideData.ride._id,
                    fare: res.data?.data?.fare || rideData.ride.fare,
                    distance: res.data?.data?.distance || rideData.ride.distance,
                    pickupAddress: rideData.ride.pickup.address,
                    dropAddress: rideData.ride.drop.address,
                    completedAt: res.data?.data?.completedAt || new Date().toISOString()
                }
            });
        } catch (err: any) {
            Alert.alert("Error", err.response?.data?.message || "Failed to complete ride");
        }
    }, [rideData]);

    const handleCancelRide = useCallback(() => {
        Alert.alert(
            "Cancel Ride",
            "Are you sure you want to cancel this ride? This may affect your acceptance rate.",
            [
                { text: "Keep Ride", style: "cancel" },
                {
                    text: "Cancel Ride",
                    style: "destructive",
                    onPress: async () => {
                        if (!rideData) return;
                        setCancelling(true);
                        setIsTrackingActive(false);
                        try {
                            await api.post(`/rides/${rideData.ride._id}/cancel`, { cancelReason: "driver_cancelled" });
                            router.push("/(driver)/home");
                            setTimeout(() => setCancelling(false), 500);
                        } catch (err: any) {
                            setCancelling(false);
                            setIsTrackingActive(true); // Resume tracking if cancel fails
                            Alert.alert("Error", err.response?.data?.message || "Failed to cancel ride");
                        }
                    },
                },
            ]
        );
    }, [rideData]);

    const handleCallRider = useCallback(() => {
        // TODO: deep-link to phone dialler with rider's number
    }, []);

    const handleMessageRider = useCallback(() => {
        // TODO: open in-app chat or SMS with rider
    }, []);

    // ── Primary CTA depends on current status ─────────────────────────────────
    const renderPrimaryAction = () => {
        if (rideStatus === "accepted") {
            return (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleMarkArriving}
                    className="flex-[2] h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
                    accessibilityLabel="Mark as arriving"
                >
                    <Text className="text-[#071018] text-[14px] font-bold">
                        I'm Arriving
                    </Text>
                </TouchableOpacity>
            );
        }
        if (rideStatus === "arriving") {
            return (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleOpenOTPVerify}
                    className="flex-[2] h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
                    accessibilityLabel="Verify OTP to start ride"
                >
                    <View className="flex-row items-center gap-x-2">
                        <Ionicons name="keypad-outline" size={17} color="#071018" />
                        <Text className="text-[#071018] text-[14px] font-bold">
                            Enter OTP
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }
        if (rideStatus === "started") {
            return (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCompleteRide}
                    className="flex-[2] h-14 bg-[#10B981] rounded-2xl items-center justify-center"
                    accessibilityLabel="Complete ride"
                >
                    <Text className="text-white text-[14px] font-bold">Complete Ride</Text>
                </TouchableOpacity>
            );
        }
        return null;
    };

    // ── Map initial region ────────────────────────────────────────────────────
    const initialRegion = rideData ? {
        latitude: rideData.ride.pickup.location.coordinates[1],
        longitude: rideData.ride.pickup.location.coordinates[0],
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
    } : undefined;

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading || !rideData) {
        return (
            <View className="flex-1 bg-[#131D2B] items-center justify-center">
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <ActivityIndicator size="large" color="#11E0C5" />
            </View>
        );
    }

    const ride = rideData.ride;
    const pickupLat = ride.pickup.location.coordinates[1];
    const pickupLng = ride.pickup.location.coordinates[0];
    const dropLat = ride.drop.location.coordinates[1];
    const dropLng = ride.drop.location.coordinates[0];

    return (
        <View className="flex-1 bg-[#131D2B] relative">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── LIVE MAP ──────────────────────────────────────────────── */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                initialRegion={initialRegion}
                showsUserLocation={false}
                showsCompass={false}
                toolbarEnabled={false}
                customMapStyle={DARK_MAP_STYLE}
            >
                {/* Pickup marker */}
                <Marker
                    coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                    title="Pickup"
                    description={ride.pickup.address}
                    pinColor="#11E0C5"
                    identifier="pickup-marker"
                />

                {/* Drop-off marker */}
                <Marker
                    coordinate={{ latitude: dropLat, longitude: dropLng }}
                    title="Drop-off"
                    description={ride.drop.address}
                    pinColor="#EF4444"
                    identifier="dropoff-marker"
                />

                {/* Driver (self) marker — uses live GPS fix */}
                {currentLocation && (
                    <Marker
                        coordinate={{
                            latitude: currentLocation.lat,
                            longitude: currentLocation.lng,
                        }}
                        title="You"
                        identifier="driver-self-marker"
                    >
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
                            <Ionicons name="navigate" size={18} color="#071018" />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* ── Location error / permission denied banner ──────────────── */}
            {(permissionDenied || locationError) && (
                <SafeAreaView className="absolute top-0 left-0 right-0 z-20">
                    <View className="mx-4 mt-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-xl flex-row items-center">
                        <Feather name="alert-triangle" size={13} color="#EF4444" />
                        <Text className="text-red-400 text-[11px] font-semibold ml-2 flex-1" numberOfLines={2}>
                            {permissionDenied
                                ? "Location permission denied — rider cannot see your position."
                                : locationError}
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

            {/* ── GPS status badge (top-right) ──────────────────────────── */}
            <SafeAreaView className="absolute top-4 right-4 z-10">
                <View className="bg-[#0D1420]/90 border border-white/10 px-3 py-1.5 rounded-xl flex-row items-center gap-x-1.5">
                    {currentLocation ? (
                        <>
                            <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                            <Text className="text-[#11E0C5] text-[10px] font-semibold">
                                GPS Active
                            </Text>
                        </>
                    ) : (
                        <>
                            <ActivityIndicator size={10} color="#748096" />
                            <Text className="text-[#748096] text-[10px]">Acquiring GPS…</Text>
                        </>
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
                        <RideStatusCard status={rideStatus} />
                    </View>

                    <View
                        className={`${glassCard} p-5`}
                        style={{
                            shadowColor: "#000",
                            shadowOpacity: 0.3,
                            shadowRadius: 20,
                            elevation: 20,
                        }}
                    >
                        {/* Trip stats */}
                        <View className="flex-row items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                            <View>
                                <Text className="text-[#748096] text-[10px] uppercase tracking-wider">
                                    Estimated Time
                                </Text>
                                {/* TODO: replace with real ETA from maps SDK */}
                                <Text className="text-white text-[17px] font-bold mt-0.5">
                                    ~12 min
                                </Text>
                            </View>
                            <FareDistanceRow fare={ride.fare} distance={ride.distance} />
                        </View>

                        {/* Rider info */}
                        <View className="mb-4">
                            <RiderInfoCard
                                rider={rideData.ride.rider}
                                onCallPress={handleCallRider}
                                onMessagePress={handleMessageRider}
                            />
                        </View>

                        {/* Route */}
                        <View className="border-t border-white/[0.05] pt-4 mb-5">
                            <RouteRow pickup={ride.pickup} drop={ride.drop} />
                        </View>

                        {/* Action buttons */}
                        <View className="flex-row gap-x-3">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleCancelRide}
                                disabled={cancelling || rideStatus === "started"}
                                className="flex-1 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl items-center justify-center"
                                accessibilityLabel="Cancel ride"
                            >
                                {cancelling ? (
                                    <ActivityIndicator size="small" color="#EF4444" />
                                ) : (
                                    <Text className="text-red-400 text-[13px] font-bold">
                                        Cancel
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {renderPrimaryAction()}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// ─── Dark map style (mirrors live-tracking.tsx) ───────────────────────────────

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
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#07111e" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3a4d60" }],
    },
];
