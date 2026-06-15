import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Animated,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { api } from "@/services/api";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import type { NewRideRequestPayload } from "@/services/socket.types";
import { onRideUnavailable } from "@/services/socket";

const COUNTDOWN_SECONDS = 30;

function getInitials(name: string): string {
    if (!name) return "RS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RideRequestModal() {
    const params = useLocalSearchParams();
    const requestDataStr = params.requestData as string;
    const initialRequest: NewRideRequestPayload | null = requestDataStr 
        ? JSON.parse(requestDataStr) 
        : null;

    const [request] = useState<NewRideRequestPayload | null>(initialRequest);
    const [accepting, setAccepting] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    // Countdown animation progress bar
    const progressAnim = useRef(new Animated.Value(1)).current;
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Slide-in animation for the card
    const slideAnim = useRef(new Animated.Value(80)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide card up on mount
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 320,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
            }),
        ]).start();

        // Progress bar drains over COUNTDOWN_SECONDS
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: COUNTDOWN_SECONDS * 1000,
            useNativeDriver: false,
        }).start();

        // Tick the numeric countdown
        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!);
                    handleDeclineRide();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Listen for ride unavailable event
        let offUnavailable: (() => void) | undefined;
        if (initialRequest) {
            offUnavailable = onRideUnavailable((payload) => {
                if (payload.rideId === initialRequest._id) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    router.back();
                }
            });
        }

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (offUnavailable) offUnavailable();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAcceptRide = useCallback(async () => {
        if (accepting || !request) return;
        if (countdownRef.current) clearInterval(countdownRef.current);
        setAccepting(true);
        
        try {
            await api.post(`/rides/${request._id}/accept`);
            // On success, navigate to active-ride.
            router.push("/(driver)/active-ride");
            
            // Just in case router.push doesn't immediately unmount this component,
            // reset the loading state after a tiny delay so it doesn't spin forever
            setTimeout(() => setAccepting(false), 500);
        } catch (error: any) {
            console.log("Accept ride error", error?.response?.data || error);
            setAccepting(false);
            const errMsg = error?.response?.data?.message || "Failed to accept ride. It may have been cancelled or assigned to another driver.";
            Alert.alert("Cannot Accept", errMsg, [
                { text: "OK", onPress: () => router.back() }
            ]);
        }
    }, [accepting, request]);

    const handleDeclineRide = useCallback(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        // TODO: optionally emit a "decline" event to backend
        router.back();
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    // Safety guard
    if (!request) {
        return (
            <View className="flex-1 bg-[#070B12] items-center justify-center">
                <ActivityIndicator size="large" color="#11E0C5" />
            </View>
        );
    }

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
            </View>

            <SafeAreaView className="flex-1 px-5 pt-3">
                {/* Header */}
                <View className="flex-row items-center justify-between mt-2 mb-6">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleDeclineRide}
                        className="p-2 -ml-2"
                        accessibilityLabel="Dismiss request"
                    >
                        <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                    </TouchableOpacity>
                    <Text className="text-white text-[24px] italic tracking-wide">
                        new request
                    </Text>
                    {/* Countdown badge */}
                    <View className="bg-[#131D2B]/95 border border-white/[0.06] rounded-xl px-3 py-1.5 min-w-[44px] items-center">
                        <Text
                            className="font-bold text-[15px]"
                            style={{ color: countdown <= 10 ? "#EF4444" : "#11E0C5" }}
                        >
                            {countdown}s
                        </Text>
                    </View>
                </View>

                {/* Countdown progress bar */}
                <View className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-6">
                    <Animated.View
                        className="h-full rounded-full"
                        style={{
                            backgroundColor: countdown <= 10 ? "#EF4444" : "#11E0C5",
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", "100%"],
                            }),
                        }}
                    />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                >
                    <Animated.View
                        style={{
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        }}
                    >
                        {/* RIDER INFO */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <View className="flex-row items-center mb-4">
                                <View className="w-12 h-12 rounded-full bg-[#131D2B] border border-white/15 items-center justify-center mr-3">
                                    <Text className="text-[#11E0C5] font-bold text-[14px]">
                                        {getInitials(request.rider.fullname)}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-bold text-[15px]">
                                        {request.rider.fullname}
                                    </Text>
                                    <Text className="text-[#748096] text-[12px] mt-0.5">
                                        @{request.rider.username}  ·  ⭐ 4.8
                                    </Text>
                                </View>
                                <View className="bg-[#11E0C5]/10 border border-[#11E0C5]/20 px-2.5 py-1 rounded-lg">
                                    <Text className="text-[#11E0C5] text-[11px] font-bold">NEW</Text>
                                </View>
                            </View>

                            {/* Divider */}
                            <View className="h-[1px] bg-white/[0.05] mb-4" />

                            {/* Fare + Distance */}
                            <FareDistanceRow fare={request.fare} distance={request.distance} />
                        </View>

                        {/* ROUTE CARD */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <View className="flex-row items-center mb-4">
                                <View className="w-7 h-7 rounded-lg bg-[#11E0C5]/10 items-center justify-center mr-2">
                                    <Ionicons name="map-outline" size={15} color="#11E0C5" />
                                </View>
                                <Text className="text-[#748096] text-[11px] uppercase tracking-wider">
                                    Route Details
                                </Text>
                            </View>
                            <RouteRow
                                pickup={request.pickup}
                                drop={request.drop}
                            />
                        </View>

                        {/* TRIP META */}
                        <View className={`${glassCard} p-4 mb-6`}>
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <Feather name="clock" size={13} color="#748096" />
                                    <Text className="text-[#748096] text-[11px] ml-1.5">
                                        {/* TODO: calculate ETA from driver's current location */}
                                        ~{Math.ceil((request.distance ?? 5) / 0.4)} min drive
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Feather name="navigation" size={13} color="#748096" />
                                    <Text className="text-[#748096] text-[11px] ml-1.5">
                                        {/* TODO: replace with real pickup ETA */}
                                        ~8 min to pickup
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* ACTION BUTTONS */}
                        <View className="flex-row gap-x-3">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleDeclineRide}
                                className="flex-1 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl items-center justify-center"
                                accessibilityLabel="Decline ride request"
                            >
                                <Text className="text-red-400 text-[14px] font-bold">Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleAcceptRide}
                                disabled={accepting}
                                className="flex-[2] h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
                                accessibilityLabel="Accept ride request"
                            >
                                {accepting ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Text className="text-[#071018] text-[15px] font-bold">
                                        Accept Ride
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
