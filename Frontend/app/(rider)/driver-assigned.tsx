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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import DriverInfoCard from "@/components/ride/DriverInfoCard";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import RideStatusCard from "@/components/ride/RideStatusCard";
import { api } from "@/services/api";
import { onRideStatusUpdated, onRideCancelled } from "@/services/socket";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DriverAssignedScreen() {
    const [rideData, setRideData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    // Slide-in entry
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchRide = async () => {
            try {
                const res = await api.get("/rides/current");
                if (res.data?.data) {
                    setRideData(res.data.data);
                } else {
                    router.replace("/(rider)/home");
                }
            } catch (error) {
                console.error("[DriverAssigned] Error fetching ride:", error);
                router.replace("/(rider)/home");
            } finally {
                setLoading(false);
            }
        };

        fetchRide();

        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        const offStatus = onRideStatusUpdated((payload) => {
            if (payload.status === "arriving" || payload.status === "started") {
                router.replace("/(rider)/live-tracking");
            }
        });

        const offCancel = onRideCancelled(() => {
            Alert.alert("Ride Cancelled", "The driver cancelled the ride.");
            router.replace("/(rider)/home");
        });

        return () => {
            offStatus();
            offCancel();
        };
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
                            router.replace("/(rider)/home");
                        } catch (err: any) {
                            setCancelling(false);
                            Alert.alert("Error", err.response?.data?.message || "Failed to cancel ride.");
                        }
                    },
                },
            ]
        );
    }, []);

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

            {loading ? (
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
                        <View className="bg-[#11E0C5]/5 border border-[#11E0C5]/15 rounded-[20px] p-4 mb-4">
                            <View className="flex-row items-start">
                                <View className="w-8 h-8 rounded-lg bg-[#11E0C5]/10 items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                                    <Ionicons name="keypad-outline" size={16} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[#11E0C5] font-bold text-[13px]">
                                        Your Trip OTP
                                    </Text>
                                    <Text className="text-white/80 text-[11px] mt-1 leading-4">
                                        Share this code with your driver to start the ride.
                                    </Text>
                                    {/* TODO: show real OTP from ride data */}
                                    <View className="flex-row gap-x-2 mt-3">
                                        {["·", "·", "·", "·", "·", "·"].map((_, i) => (
                                            <View
                                                key={i}
                                                className="w-9 h-10 rounded-xl bg-[#131D2B] border border-[#11E0C5]/30 items-center justify-center"
                                            >
                                                <Text className="text-[#11E0C5] text-[18px] font-bold">
                                                    ·
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
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
