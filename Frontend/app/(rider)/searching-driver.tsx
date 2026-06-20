import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Alert,
    AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RideStatusCard from "@/components/ride/RideStatusCard";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";

import { api } from "@/services/api";
import { onRideAccepted, onRideCancelled, connectSocket } from "@/services/socket";
import { getAccessToken } from "@/services/storage";
import { useTheme } from "@/store/ThemeContext";
import { BlurView } from "expo-blur";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SearchingDriverScreen() {
    const { colorScheme, theme } = useTheme();
    const { otp } = useLocalSearchParams();
    const [cancelling, setCancelling] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [currentRide, setCurrentRide] = useState<any>(null);

    // Pulsing radar rings
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;
    const iconScale = useRef(new Animated.Value(1)).current;
    const shimmerOpacity = useRef(new Animated.Value(0.3)).current;

    // Elapsed search timer
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Listener refs — prevent stale-closure in AppState handler ────────────
    const offAcceptedRef = useRef<(() => void) | undefined>(undefined);
    const offCancelledRef = useRef<(() => void) | undefined>(undefined);

    // ── State Recovery & Socket Subscriptions ─────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            // Fix: Reset and start timer only while screen is focused to prevent memory leaks
            setElapsedSeconds(0);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);

            const setupState = async () => {
                try {
                    // 1. Always fetch the true source of truth
                    const res = await api.get("/rides/current");
                    if (!isActive) return;

                    const ride = res.data?.data;
                    if (ride) {
                        setCurrentRide(ride);
                        // Fast-forward if state changed while backgrounded/away
                        if (ride.status === "accepted") {
                            router.replace({
                                pathname: "/(rider)/driver-assigned",
                                params: { otp: ride.otp || otp }
                            });
                            return;
                        } else if (ride.status === "arriving" || ride.status === "started") {
                            router.replace("/(rider)/live-tracking");
                            return;
                        }
                    } else {
                        // Ride missing or cancelled
                        router.replace("/(rider)/home");
                        return;
                    }

                    // 2. Ensure socket is connected and listening
                    const token = await getAccessToken();
                    if (token && isActive) {
                        connectSocket(token);

                        // Clean up previous listeners — refs ensure we see current values
                        if (offAcceptedRef.current) offAcceptedRef.current();
                        if (offCancelledRef.current) offCancelledRef.current();

                        offAcceptedRef.current = onRideAccepted((payload) => {
                            router.replace({
                                pathname: "/(rider)/driver-assigned",
                                params: { otp: payload.ride?.otp || otp || "" }
                            });
                        });

                        offCancelledRef.current = onRideCancelled((payload) => {
                            if (payload.cancelledBy === "rider") return;
                            Alert.alert("Ride Cancelled", "Your ride request was cancelled.");
                            router.replace("/(rider)/home");
                        });
                    }
                } catch (error) {
                    console.error("[SearchingDriver] Recovery error:", error);
                    // On error, let the user stay here or fallback home, but don't force loop.
                }
            };

            setupState();

            // Re-run recovery when app foregrounds
            const subscription = AppState.addEventListener("change", (nextAppState) => {
                if (nextAppState === "active") {
                    setupState();
                }
            });

            return () => {
                isActive = false;
                subscription.remove();
                if (offAcceptedRef.current) offAcceptedRef.current();
                if (offCancelledRef.current) offCancelledRef.current();
                offAcceptedRef.current = undefined;
                offCancelledRef.current = undefined;

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }, [otp])
    );

    // ── Animations & Timers (run once on mount) ───────────────────────────────
    useEffect(() => {
        // Staggered expanding ring pulse
        const animateRing = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 1800,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateRing(ring1, 0);
        animateRing(ring2, 600);
        animateRing(ring3, 1200);

        // Icon subtle breathe
        Animated.loop(
            Animated.sequence([
                Animated.timing(iconScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
                Animated.timing(iconScale, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        // Shimmer effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerOpacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(shimmerOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatElapsed = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCancelRide = useCallback(() => {
        Alert.alert(
            "Cancel Search",
            "Stop searching for a driver?",
            [
                { text: "Keep Searching", style: "cancel" },
                {
                    text: "Cancel",
                    style: "destructive",
                    onPress: async () => {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setCancelling(true);

                        try {
                            let rideIdToCancel = currentRide?._id;

                            // Fallback: if user taps cancel before fetch completes
                            if (!rideIdToCancel) {
                                const res = await api.get("/rides/current");
                                rideIdToCancel = res.data?.data?._id;
                            }

                            if (rideIdToCancel) {
                                await api.post(`/rides/${rideIdToCancel}/cancel`, {
                                    cancelReason: "rider_cancelled"
                                });
                            }
                            // Navigate home regardless of whether we found the ID
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
    }, [currentRide]);

    // Ring animation helpers
    const ringStyle = (anim: Animated.Value) => ({
        opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.3, 0] }),
        transform: [
            {
                scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }),
            },
        ],
    });

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-background">
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
                {/* HEADER */}
                <View className="flex-row items-center justify-between mt-2 mb-4">
                    <Text className="text-foreground text-[24px] italic tracking-wide">
                        searching...
                    </Text>
                    <View className="bg-input/95 border border-border rounded-xl px-3 py-1.5">
                        <Text className="text-muted text-[11px]">
                            {formatElapsed(elapsedSeconds)}
                        </Text>
                    </View>
                </View>

                {/* STATUS BADGE */}
                <View className="mb-6">
                    <RideStatusCard
                        status="requested"
                        subtitle="Looking for nearby available drivers…"
                    />
                </View>

                {/* RADAR ANIMATION AREA */}
                <View className="flex-1 items-center justify-center">
                    <View className="w-[220px] h-[220px] items-center justify-center">
                        {/* Expanding rings */}
                        <Animated.View
                            className="absolute w-[130px] h-[130px] rounded-full border border-primary/40"
                            style={ringStyle(ring1)}
                        />
                        <Animated.View
                            className="absolute w-[130px] h-[130px] rounded-full border border-primary/30"
                            style={ringStyle(ring2)}
                        />
                        <Animated.View
                            className="absolute w-[130px] h-[130px] rounded-full border border-primary/20"
                            style={ringStyle(ring3)}
                        />

                        {/* Center icon */}
                        <View className="w-[130px] h-[130px] rounded-full bg-card/90 border border-border items-center justify-center">
                            <View className="w-[90px] h-[90px] rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                                <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                                    <MaterialCommunityIcons
                                        name="radar"
                                        size={40}
                                        color={theme.colors.primary}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </View>

                    <Text className="text-foreground text-[18px] font-bold mt-6">
                        Finding your driver
                    </Text>
                    <Text className="text-muted text-[13px] mt-2 text-center max-w-[260px] leading-5">
                        We&apos;re connecting you with the nearest available driver. Please keep the app open.
                    </Text>
                </View>

                {/* BOTTOM PANEL */}
                <View
                    style={{
                        marginTop: "auto",
                        marginHorizontal: -20,
                        marginBottom: -12,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        overflow: "hidden",
                        shadowColor: "#000",
                        shadowOpacity: 0.6,
                        shadowRadius: 32,
                        elevation: 24,
                    }}
                >
                    <BlurView
                        tint={colorScheme === 'dark' ? 'dark' : 'light'}
                        intensity={80}
                        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
                    >
                        <View className="w-12 h-1 bg-foreground/20 rounded-full self-center mb-5" />

                        {/* RIDE SUMMARY CARD */}
                        {currentRide ? (
                            <View
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderRadius: 24,
                                    padding: 20,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.05,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 4,
                                }}
                            >
                                <View className="mb-4">
                                    <FareDistanceRow
                                        fare={currentRide.fare}
                                        distance={currentRide.distance}
                                    />
                                </View>
                                <View className="h-[1px] bg-foreground/[0.05] mb-4" />
                                <RouteRow
                                    pickup={currentRide.pickup}
                                    drop={currentRide.drop}
                                />
                            </View>
                        ) : (
                            // Skeleton while loading current ride
                            <View
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderRadius: 24,
                                    padding: 20,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    height: 140,
                                    justifyContent: "space-around"
                                }}
                            >
                                <Animated.View style={{ opacity: shimmerOpacity, height: 24, width: '40%', backgroundColor: theme.colors.border, borderRadius: 8 }} />
                                <Animated.View style={{ opacity: shimmerOpacity, height: 1, width: '100%', backgroundColor: theme.colors.border }} />
                                <Animated.View style={{ opacity: shimmerOpacity, height: 16, width: '80%', backgroundColor: theme.colors.border, borderRadius: 6 }} />
                                <Animated.View style={{ opacity: shimmerOpacity, height: 16, width: '60%', backgroundColor: theme.colors.border, borderRadius: 6 }} />
                            </View>
                        )}

                        {/* CANCEL BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleCancelRide}
                            disabled={cancelling}
                            style={{
                                height: 60,
                                backgroundColor: theme.colors.danger + "1A",
                                borderWidth: 1.5,
                                borderColor: theme.colors.danger + "33",
                                borderRadius: 20,
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 8,
                            }}
                            accessibilityLabel="Cancel ride search"
                        >
                            {cancelling ? (
                                <ActivityIndicator size="small" color={theme.colors.danger} />
                            ) : (
                                <Text style={{ color: theme.colors.danger, fontSize: 16, fontWeight: "800" }}>
                                    Cancel Search
                                </Text>
                            )}
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </SafeAreaView>
        </View>
    );
}
