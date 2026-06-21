import React, { useState, useCallback, useRef, useEffect } from "react";
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
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import RouteRow from "@/components/ride/RouteRow";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import { useTheme } from "@/store/ThemeContext";

import { api } from "@/services/api";
import { onPaymentReceived } from "@/services/socket";
import { createPaymentOrder, verifyPaymentSignature } from "@/services/payment";

// ─── Star rating component ─────────────────────────────────────────────────────
function StarRating({
    rating,
    onRate,
}: {
    rating: number;
    onRate: (r: number) => void;
}) {
    return (
        <View className="flex-row gap-x-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => onRate(star)}
                    className="p-1"
                    accessibilityLabel={`Rate ${star} out of 5 stars`}
                >
                    <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={34}
                        color={star <= rating ? "#FFC107" : "#748096"}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RiderRideComplete() {
    const { colorScheme, theme } = useTheme();
    const params = useLocalSearchParams();
    const rideId = params.rideId as string;

    const [rideData, setRideData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [driverRating, setDriverRating] = useState(0);
    const [paying, setPaying] = useState(false);

    // Entry animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Fetch ride data on mount or focus
    const fetchRide = useCallback(async () => {
        if (!rideId) return;
        try {
            const res = await api.get('/rides/history?limit=10');
            const rides = res.data?.data?.rides || [];
            const targetRide = rides.find((r: any) => r._id === rideId);

            if (targetRide) {
                setRideData(targetRide);
            } else {
                // If it's not in history yet, maybe it's still current
                const currentRes = await api.get('/rides/current');
                if (currentRes.data?.data?._id === rideId) {
                    setRideData(currentRes.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching ride:", error);
            Alert.alert("Error", "Could not fetch ride details.");
        } finally {
            setLoading(false);
        }
    }, [rideId]);

    useFocusEffect(
        useCallback(() => {
            fetchRide();
        }, [fetchRide])
    );

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Socket listener for payment
    useEffect(() => {
        const offPayment = onPaymentReceived((payload) => {
            if (payload._id === rideId) {
                fetchRide(); // Always refetch latest state from backend as source of truth
            }
        });
        return offPayment;
    }, [rideId, fetchRide]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRateDriver = useCallback((rating: number) => {
        setDriverRating(rating);
        // TODO: call POST /rides/:id/rate with { rating, role: "rider" }
    }, []);

    const handleBookAnother = useCallback(() => {
        router.replace("/(rider)/create-ride");
    }, []);

    const handleGoHome = useCallback(() => {
        router.replace("/(rider)/home");
    }, []);

    const handleRazorpayPayment = async () => {
        if (paying || !rideData) return; // Prevent duplicate checkouts
        setPaying(true);

        try {
            const order = await createPaymentOrder(rideId, rideData.fare);

            const options = {
                description: 'Ride Fare',
                image: 'https://i.imgur.com/3g7nmJC.png', // Or use rideSync logo
                currency: order.currency,
                key: process.env.EXPO_PUBLIC_RAZORPAY_KEY || 'rzp_test_T3vvWOZt29qLC7',
                amount: order.amount.toString(),
                name: 'RideSync',
                order_id: order.id,
                theme: { color: COLORS.primary },
                prefill: {
                    email: rideData.rider?.email || '',
                    contact: '',
                    name: rideData.rider?.fullname || ''
                }
            };

            const data = await RazorpayCheckout.open(options);

            // Verify payment on backend
            await verifyPaymentSignature({
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                rideId: rideId
            });

            // Fetch latest ride state after verification
            await fetchRide();

        } catch (error: any) {
            console.error("Payment Error:", error);
            // Razorpay error can be an object with code and description
            const errorMsg = typeof error === 'string' ? error : error.description || error.message || "Payment cancelled or failed.";
            Alert.alert("Payment", errorMsg);
        } finally {
            setPaying(false);
        }
    };

    if (loading || !rideData) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const completedTime = rideData.completedAt ? new Date(rideData.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    }) : "--:--";

    const driverName = rideData.driver?.user?.fullname || "Driver";

    const ratingLabel =
        driverRating === 5
            ? "Amazing driver! 🎉"
            : driverRating >= 4
                ? "Great ride 👍"
                : driverRating >= 3
                    ? "It was okay"
                    : driverRating > 0
                        ? "Could be better"
                        : "Tap a star to rate";

    const isPaid = rideData.paymentStatus === "paid";
    const paymentMethodDisplay = rideData.paymentMethod === "cash" ? "Cash" : "Razorpay Online";

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
                <View className="absolute bottom-[-100px] right-[-50px] w-[300px] h-[300px] rounded-full bg-primary/5" />
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
                        <View className="items-center mt-4 mb-6">
                            <View className="w-24 h-24 rounded-full bg-primary/10 border border-primary/25 items-center justify-center mb-4">
                                <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
                                    <Ionicons name="checkmark" size={36} color={theme.colors.primary} />
                                </View>
                            </View>
                            <Text className="text-foreground text-[28px] font-bold tracking-tight">
                                You've Arrived!
                            </Text>
                            <Text className="text-muted text-[14px] mt-1">
                                Trip completed at {completedTime}
                            </Text>
                        </View>

                        {/* FARE HIGHLIGHT */}
                        <View
                            className="items-center py-5 mb-4 rounded-[30px] border border-border"
                            style={{ backgroundColor: theme.colors.card }}
                        >
                            <Text className="text-muted text-[11px] uppercase tracking-wider mb-1">
                                Total Fare
                            </Text>
                            <Text className="text-foreground text-[44px] font-bold tracking-tight">
                                ₹{(rideData.fare || 0).toFixed(0)}
                            </Text>

                            <View className="flex-row items-center mt-2 gap-x-1.5">
                                <Feather name="credit-card" size={12} color={theme.colors.textMuted} />
                                <Text className="text-muted text-[12px]">
                                    {paymentMethodDisplay}
                                </Text>
                            </View>

                            {/* Payment Status Badge */}
                            <View className={`mt-3 px-3 py-1 rounded-full ${isPaid ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                                <Text className={`${isPaid ? 'text-green-500' : 'text-orange-500'} text-[12px] font-bold uppercase`}>
                                    {isPaid ? "Paid" : "Pending Payment"}
                                </Text>
                            </View>
                        </View>

                        {/* TRIP SUMMARY */}
                        <View className={`${glassCard} p-5 mb-4`}>
                            <Text className="text-muted text-[11px] uppercase tracking-wider mb-4">
                                Trip Summary
                            </Text>

                            <FareDistanceRow
                                fare={rideData.fare}
                                distance={rideData.distance}
                            />

                            <View className="h-[1px] bg-foreground/[0.05] my-4" />

                            <RouteRow
                                pickup={rideData.pickup}
                                drop={rideData.drop}
                            />

                            <View className="h-[1px] bg-foreground/[0.05] mt-4 mb-3" />

                            {/* Driver info */}
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="w-8 h-8 rounded-full bg-input border border-border items-center justify-center mr-2">
                                        <Text className="text-primary text-[10px] font-bold">
                                            {driverName
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                                .toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-foreground text-[13px] font-semibold">
                                        {driverName}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* RATE DRIVER */}
                        {isPaid && (
                            <View className={`${glassCard} p-5 mb-5`}>
                                <View className="flex-row items-center mb-4">
                                    <View className="w-7 h-7 rounded-lg bg-[#FFC107]/10 items-center justify-center mr-2">
                                        <Ionicons name="star" size={15} color="#FFC107" />
                                    </View>
                                    <Text className="text-muted text-[11px] uppercase tracking-wider">
                                        Rate Your Driver
                                    </Text>
                                </View>

                                <StarRating rating={driverRating} onRate={handleRateDriver} />

                                <Text className="text-muted text-[12px] text-center mt-3">
                                    {ratingLabel}
                                </Text>
                            </View>
                        )}

                        {/* QUICK STATS */}
                        <View className="flex-row gap-x-3 mb-6">
                            <View className={`${glassCard} flex-1 p-4 items-center`}>
                                <Feather name="navigation" size={16} color={theme.colors.textMuted} />
                                <Text className="text-muted text-[10px] mt-1">Distance</Text>
                                <Text className="text-foreground text-[15px] font-bold mt-0.5">
                                    {(rideData.distance || 0).toFixed(1)} km
                                </Text>
                            </View>
                            <View className={`${glassCard} flex-1 p-4 items-center`}>
                                <Ionicons name="star" size={16} color="#FFC107" />
                                <Text className="text-muted text-[10px] mt-1">Driver</Text>
                                <Text className="text-foreground text-[15px] font-bold mt-0.5">4.9</Text>
                            </View>
                        </View>

                        {/* ACTION BUTTONS */}
                        <View className="gap-y-3">
                            {/* Payment action if not paid */}
                            {!isPaid && rideData.paymentMethod !== "cash" && (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={handleRazorpayPayment}
                                    disabled={paying}
                                    className="h-14 bg-blue-600 rounded-2xl items-center justify-center border border-blue-500 shadow-lg"
                                    accessibilityLabel="Pay with Razorpay"
                                >
                                    {paying ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <View className="flex-row items-center gap-x-2">
                                            <Ionicons name="card" size={20} color="#ffffff" />
                                            <Text className="text-white text-[16px] font-bold">
                                                Pay ₹{(rideData.fare || 0).toFixed(0)} Online
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}

                            {isPaid && (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={handleBookAnother}
                                    className="h-14 bg-primary rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
                                    accessibilityLabel="Book another ride"
                                >
                                    <View className="flex-row items-center gap-x-2">
                                        <Ionicons name="car-sport" size={18} color="#071018" />
                                        <Text className="text-background text-[16px] font-bold">
                                            Book Another Ride
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleGoHome}
                                className="h-14 bg-input/95 border border-border rounded-2xl items-center justify-center"
                                accessibilityLabel="Go to home screen"
                            >
                                <Text className="text-foreground text-[15px] font-semibold">
                                    Back to Home
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
