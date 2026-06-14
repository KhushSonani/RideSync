import React, { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { api } from "@/services/api";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import OTPInput from "@/components/ride/OTPInput";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function OTPVerifyScreen() {
    const { rideId } = useLocalSearchParams();
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");

    // Shake animation for wrong OTP
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const triggerShake = useCallback(() => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleOTPChange = useCallback((value: string) => {
        setOtp(value);
        if (error) setError("");
    }, [error]);

    const handleStartRide = useCallback(async () => {
        if (otp.length < 6) {
            setError("Please enter the full 6-digit OTP shared by the rider.");
            triggerShake();
            return;
        }
        setVerifying(true);
        setError("");
        
        try {
            await api.post(`/rides/${rideId}/start`, { otp });
            router.replace("/(driver)/active-ride");
        } catch (err: any) {
            setError(err.response?.data?.message || "Incorrect OTP. Please try again.");
            triggerShake();
        } finally {
            setVerifying(false);
        }
    }, [otp, triggerShake, rideId]);

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
                <View
                    className="absolute top-[-20px] right-[-40px] w-[260px] h-[260px] rounded-full items-center justify-center"
                    style={{ backgroundColor: COLORS.glowRing }}
                >
                    <View className="w-[190px] h-[190px] rounded-full bg-[#1D6B61]/15" />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
                >
                    <SafeAreaView className="flex-1 px-5 pt-3">
                        {/* HEADER */}
                        <View className="flex-row items-center mt-1 px-1 mb-8">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => router.back()}
                                className="p-2 -ml-2"
                                accessibilityLabel="Go back"
                            >
                                <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                            </TouchableOpacity>
                            <Text className="text-white text-[24px] italic ml-5 tracking-wide">
                                verify otp
                            </Text>
                        </View>

                        {/* HERO ICON */}
                        <View className="items-center mb-8">
                            <View className="w-20 h-20 rounded-[24px] bg-[#0D1420]/90 border border-white/[0.08] items-center justify-center mb-4">
                                <View className="w-14 h-14 rounded-[18px] bg-[#11E0C5]/15 border border-[#11E0C5]/20 items-center justify-center">
                                    <Ionicons name="keypad-outline" size={28} color="#11E0C5" />
                                </View>
                            </View>
                            <Text className="text-white text-[26px] font-bold tracking-tight">
                                Start Ride
                            </Text>
                            <Text className="text-[#748096] text-[14px] text-center mt-2 max-w-[280px] leading-5">
                                Ask the rider for the 6-digit OTP shown on their screen to verify and start the trip.
                            </Text>
                        </View>

                        {/* OTP CARD */}
                        <Animated.View
                            className={`${glassCard} p-6 mx-1`}
                            style={{
                                transform: [{ translateX: shakeAnim }],
                                shadowColor: "#11E0C5",
                                shadowOpacity: 0.06,
                                shadowRadius: 20,
                                elevation: 8,
                            }}
                        >
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-4">
                                Enter OTP
                            </Text>

                            <OTPInput
                                value={otp}
                                onChange={handleOTPChange}
                                disabled={verifying}
                            />

                            {/* Error message */}
                            {error ? (
                                <View className="flex-row items-start mt-4">
                                    <Feather name="alert-circle" size={13} color="#EF4444" />
                                    <Text className="text-red-400 text-[12px] ml-1.5 flex-1 leading-4">
                                        {error}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Info hint */}
                            {!error ? (
                                <View className="flex-row items-center mt-4 bg-[#11E0C5]/5 border border-[#11E0C5]/10 rounded-xl px-3 py-2.5">
                                    <Ionicons name="information-circle-outline" size={14} color="#11E0C5" />
                                    <Text className="text-[#748096] text-[11px] ml-2 flex-1 leading-4">
                                        The OTP is displayed on the rider's app under the trip details section.
                                    </Text>
                                </View>
                            ) : null}
                        </Animated.View>

                        {/* SUBMIT BUTTON */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleStartRide}
                            disabled={verifying || otp.length < 6}
                            className="h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10 mx-1 mt-5"
                            style={{ opacity: otp.length < 6 ? 0.5 : 1 }}
                            accessibilityLabel="Verify OTP and start ride"
                        >
                            {verifying ? (
                                <ActivityIndicator size="small" color="#071018" />
                            ) : (
                                <View className="flex-row items-center gap-x-2">
                                    <Ionicons name="checkmark-circle" size={18} color="#071018" />
                                    <Text className="text-[#071018] text-[16px] font-bold">
                                        Verify &amp; Start Ride
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Resend / help hint */}
                        <Text className="text-[#748096] text-[12px] text-center mt-4">
                            Rider not showing OTP?{" "}
                            <Text className="text-[#11E0C5] font-semibold">
                                Ask them to refresh their app.
                            </Text>
                        </Text>
                    </SafeAreaView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
