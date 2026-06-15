import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import type { RideCompletedPayload } from "@/services/socket.types";

// ─── Mock payload (replace with navigation params / context) ──────────────────
const MOCK_COMPLETED: RideCompletedPayload & {
    pickup: { address: string };
    drop: { address: string };
    distance: number;
} = {
    _id: "ride_mock_001",
    status: "completed",
    completedAt: new Date().toISOString(),
    fare: 342,
    pickup: { address: "Connaught Place, New Delhi" },
    drop: { address: "Indira Gandhi International Airport T3" },
    distance: 14.2,
};

// ─── Star rating component ────────────────────────────────────────────────────
function StarRating({
    rating,
    onRate,
}: {
    rating: number;
    onRate: (r: number) => void;
}) {
    return (
        <View className="flex-row gap-x-3 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => onRate(star)}
                    accessibilityLabel={`Rate ${star} stars`}
                >
                    <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= rating ? "#FFC107" : "#748096"}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DriverRideComplete() {
    const params = useLocalSearchParams();
    const rideData = React.useMemo(() => {
        return {
            _id: (params.rideId as string) || "completed_ride",
            status: "completed",
            completedAt: (params.completedAt as string) || new Date().toISOString(),
            fare: Number(params.fare) || 0,
            distance: Number(params.distance) || 0,
            pickup: { address: (params.pickupAddress as string) || "Pickup Location" },
            drop: { address: (params.dropAddress as string) || "Drop Location" },
        };
    }, [params]);

    const [riderRating, setRiderRating] = useState(0);

    // Confetti-style fade-in entry animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 420,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRateRider = useCallback((rating: number) => {
        setRiderRating(rating);
        // TODO: call POST /rides/:id/rate with { rating, role: "driver" }
    }, []);

    const handleGoHome = useCallback(() => {
        // TODO: clear any active ride state from context/store
        router.replace("/(driver)/home");
    }, []);

    const completedTime = new Date(rideData.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

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

            <SafeAreaView className="flex-1 px-5 pt-3">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }}
                    >
                        {/* COMPLETION HERO */}
                        <View className="items-center mt-6 mb-8">
                            <View className="w-24 h-24 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 items-center justify-center mb-5">
                                <View className="w-16 h-16 rounded-full bg-[#10B981]/20 items-center justify-center">
                                    <Ionicons name="checkmark" size={36} color="#10B981" />
                                </View>
                            </View>
                            <Text className="text-white text-[28px] font-bold tracking-tight">
                                Ride Complete!
                            </Text>
                            <Text className="text-[#748096] text-[14px] mt-1">
                                Trip ended at {completedTime}
                            </Text>
                        </View>

                        {/* EARNINGS HIGHLIGHT */}
                        <View
                            className="items-center py-6 mb-5 rounded-[30px] border border-[#10B981]/20"
                            style={{ backgroundColor: "rgba(16,185,129,0.06)" }}
                        >
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-1">
                                Trip Earnings
                            </Text>
                            <Text className="text-white text-[42px] font-bold tracking-tight">
                                ₹{rideData.fare.toFixed(0)}
                            </Text>
                            <Text className="text-[#10B981] text-[13px] font-semibold mt-1">
                                ✓ Added to your balance
                            </Text>
                        </View>

                        {/* TRIP SUMMARY */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-4">
                                Trip Summary
                            </Text>

                            <FareDistanceRow
                                fare={rideData.fare}
                                distance={rideData.distance || 0}
                            />

                            <View className="h-[1px] bg-white/[0.05] my-4" />

                            <RouteRow
                                pickup={rideData.pickup}
                                drop={rideData.drop}
                            />
                        </View>

                        {/* RATE RIDER */}
                        <View className={`${glassCard} p-5 mb-5`}>
                            <View className="flex-row items-center mb-4">
                                <View className="w-7 h-7 rounded-lg bg-[#FFC107]/10 items-center justify-center mr-2">
                                    <Ionicons name="star" size={15} color="#FFC107" />
                                </View>
                                <Text className="text-[#748096] text-[11px] uppercase tracking-wider">
                                    Rate Your Rider
                                </Text>
                            </View>

                            <StarRating rating={riderRating} onRate={handleRateRider} />

                            {riderRating > 0 ? (
                                <Text className="text-[#748096] text-[12px] text-center mt-3">
                                    {riderRating === 5 ? "Excellent rider! 🎉" :
                                     riderRating >= 4 ? "Good experience 👍" :
                                     riderRating >= 3 ? "It was okay" : "Could be better"}
                                </Text>
                            ) : (
                                <Text className="text-[#748096] text-[12px] text-center mt-3">
                                    Tap to rate
                                </Text>
                            )}
                        </View>

                        {/* QUICK STATS ROW */}
                        <View className="flex-row gap-x-4 mb-6">
                            <View className={`${glassCard} flex-1 p-4 items-center`}>
                                <Feather name="clock" size={16} color="#748096" />
                                <Text className="text-[#748096] text-[10px] mt-1">Duration</Text>
                                {/* TODO: calculate from ride.startedAt → ride.completedAt */}
                                <Text className="text-white text-[15px] font-bold mt-0.5">
                                    —
                                </Text>
                            </View>
                            <View className={`${glassCard} flex-1 p-4 items-center`}>
                                <Feather name="navigation" size={16} color="#748096" />
                                <Text className="text-[#748096] text-[10px] mt-1">Distance</Text>
                                <Text className="text-white text-[15px] font-bold mt-0.5">
                                    {(rideData.distance || 0).toFixed(1)} km
                                </Text>
                            </View>
                            <View className={`${glassCard} flex-1 p-4 items-center`}>
                                <Ionicons name="star" size={16} color="#FFC107" />
                                <Text className="text-[#748096] text-[10px] mt-1">Your Rating</Text>
                                {/* TODO: fetch actual driver rating */}
                                <Text className="text-white text-[15px] font-bold mt-0.5">
                                    4.9
                                </Text>
                            </View>
                        </View>

                        {/* GO HOME BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleGoHome}
                            className="h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
                            accessibilityLabel="Return to home screen"
                        >
                            <Text className="text-[#071018] text-[16px] font-bold">
                                Back to Dashboard
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
