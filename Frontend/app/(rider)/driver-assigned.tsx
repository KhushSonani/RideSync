import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Animated,
    Alert,
    ActivityIndicator,
    AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import DriverInfoCard from "@/components/ride/DriverInfoCard";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import RideStatusCard from "@/components/ride/RideStatusCard";
import OTPDisplay from "@/components/ride/OTPDisplay";
import { api } from "@/services/api";
import { onRideStatusUpdated, onRideCancelled, connectSocket } from "@/services/socket";
import { getAccessToken } from "@/services/storage";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DriverAssignedScreen() {
    const { otp } = useLocalSearchParams();
    const [rideData, setRideData] = useState<any>(null);
    const otpStr = (typeof otp === 'string' && otp) ? otp : (rideData?.otp || '');
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    // Slide-in entry
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── Listener refs — prevent stale-closure in AppState handler ────────────
    const offStatusRef = useRef<(() => void) | undefined>(undefined);
    const offCancelRef = useRef<(() => void) | undefined>(undefined);

    // ── State Recovery & Socket Subscriptions ─────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const setupState = async () => {
                try {
                    setLoading(true);
                    // 1. Fetch current ride state
                    const res = await api.get("/rides/current");
                    if (!isActive) return;

                    const ride = res.data?.data;
                    if (ride) {
                        setRideData(ride);
                        // Forward if status advanced while away
                        if (ride.status === "arriving" || ride.status === "started") {
                            router.replace("/(rider)/live-tracking");
                            return;
                        } else if (ride.status === "requested") {
                            router.replace("/(rider)/searching-driver");
                            return;
                        }
                    } else {
                        router.replace("/(rider)/home");
                        return;
                    }

                    // 2. Socket setup
                    const token = await getAccessToken();
                    if (token && isActive) {
                        connectSocket(token);

                        // Always clean up previous listeners before re-registering
                        // Using refs ensures the AppState re-entry reads current values
                        if (offStatusRef.current) offStatusRef.current();
                        if (offCancelRef.current) offCancelRef.current();

                        offStatusRef.current = onRideStatusUpdated((payload) => {
                            if (payload.status === "arriving" || payload.status === "started") {
                                router.replace("/(rider)/live-tracking");
                            }
                        });

                        offCancelRef.current = onRideCancelled((payload) => {
                            if (payload.cancelledBy === "rider") return;
                            Alert.alert("Ride Cancelled", "The driver cancelled the ride.");
                            router.replace("/(rider)/home");
                        });
                    }
                } catch (error) {
                    console.error("[DriverAssigned] Recovery error:", error);
                    // Fallback home on unrecoverable error
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
                if (offStatusRef.current) offStatusRef.current();
                if (offCancelRef.current) offCancelRef.current();
                offStatusRef.current = undefined;
                offCancelRef.current = undefined;
            };
        }, [])
    );

    // ── Animations ────────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    const ride = rideData;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCancelRide = useCallback(() => {
        Alert.alert(
            "Cancel Ride",
            "Cancel this trip? A driver has already been assigned.",
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
    }, [rideData]);

    const handleCallDriver = useCallback(() => {
        // TODO: deep-link to phone dialler with driver's number
    }, []);

    const handleMessageDriver = useCallback(() => {
        // TODO: open in-app chat or SMS
    }, []);

    const handleViewLiveTracking = useCallback(() => {
        router.push("/(rider)/live-tracking");
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* PREMIUM GLOW BACKGROUND */}
            <View className="absolute inset-0 overflow-hidden">
                <View
                    className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />
                <View
                    className="absolute top-[280px] -left-20 w-[240px] h-[240px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
                />
                <View className="absolute bottom-[-100px] right-[-50px] w-[300px] h-[300px] rounded-full bg-[#11E0C5]/5" />
            </View>

            {loading || !rideData ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#11E0C5" />
                </View>
            ) : (
            <SafeAreaView className="flex-1 px-5 pt-3">
                {/* HEADER */}
                <View className="flex-row items-center mt-2 mb-6">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.back()}
                        className="p-2 -ml-2"
                    >
                        <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                    </TouchableOpacity>
                    <Text className="text-white text-[24px] italic ml-5 tracking-wide">
                        driver assigned
                    </Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                >
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }}
                    >
                        {/* STATUS BADGE */}
                        <View className="mb-4">
                            <RideStatusCard
                                status="accepted"
                                subtitle="Your driver is on the way to your pickup"
                            />
                        </View>

                        {/* ETA HIGHLIGHT */}
                        <View
                            className="flex-row items-center justify-between px-5 py-4 rounded-[20px] border border-[#11E0C5]/15 mb-4"
                            style={{ backgroundColor: "rgba(17,224,197,0.05)" }}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="navigate-outline" size={18} color="#11E0C5" />
                                <View className="ml-3">
                                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider">
                                        Driver ETA
                                    </Text>
                                    <Text className="text-white text-[20px] font-bold mt-0.5">
                                        {/* TODO: real ETA from driver location + Google Maps */}
                                        ~8 min
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleViewLiveTracking}
                                className="bg-[#11E0C5]/10 border border-[#11E0C5]/20 px-3 py-2 rounded-xl flex-row items-center gap-x-1.5"
                                accessibilityLabel="Track driver on map"
                            >
                                <Feather name="map-pin" size={13} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-[12px] font-semibold">
                                    Track
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* DRIVER CARD */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-4">
                                Your Driver
                            </Text>
                            <DriverInfoCard
                                driver={rideData.driver}
                                onCallPress={handleCallDriver}
                                onMessagePress={handleMessageDriver}
                            />
                        </View>

                        {/* OTP CARD */}
                        <View className="mb-4">
                            <OTPDisplay otp={otpStr} />
                        </View>

                        {/* ROUTE CARD */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <View className="flex-row items-center mb-4">
                                <View className="w-7 h-7 rounded-lg bg-[#11E0C5]/10 items-center justify-center mr-2">
                                    <Ionicons name="map-outline" size={15} color="#11E0C5" />
                                </View>
                                <Text className="text-[#748096] text-[11px] uppercase tracking-wider">
                                    Your Route
                                </Text>
                            </View>

                            <RouteRow pickup={ride.pickup} drop={ride.drop} />

                            <View className="h-[1px] bg-white/[0.05] my-4" />

                            <FareDistanceRow fare={ride.fare} distance={ride.distance} />
                        </View>

                        {/* CANCEL BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleCancelRide}
                            disabled={cancelling}
                            className="h-14 bg-red-500/10 border border-red-500/20 rounded-2xl items-center justify-center"
                            accessibilityLabel="Cancel ride"
                        >
                            {cancelling ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <Text className="text-red-400 text-[14px] font-bold">
                                    Cancel Ride
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
            )}
        </View>
    );
}
