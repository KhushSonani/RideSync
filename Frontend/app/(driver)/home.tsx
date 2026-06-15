import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    Alert,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { getDriverStatus, getDriverProfile, updateDriverStatus } from "@/services/driver";
import { api } from "@/services/api";
import { onNewRideRequest, connectSocket } from "@/services/socket";
import { useDriverLocation } from "@/services/useDriverLocation";
import { getAccessToken } from "@/services/storage";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import VerificationBanner from "@/components/VerificationBanner";
import EmptyStateCard from "@/components/common/EmptyStateCard";

export default function DriverHome() {
    const [user, setUser] = useState<any>(null);
    const [driverState, setDriverState] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState("Welcome back");
    const [togglingStatus, setTogglingStatus] = useState(false);

    // TODO: replace with real earnings from GET /rides/history
    const recentRides: any[] = [];

    useEffect(() => {
        const hours = new Date().getHours();
        if (hours < 12) setGreeting("Good morning");
        else if (hours < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");
        
        const initSocket = async () => {
            const token = await getAccessToken();
            if (token) connectSocket(token);
        };
        
        initSocket();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

    async function fetchData() {
        try {
            setLoading(true);

            // 1. Check for active ride first
            try {
                const rideRes = await api.get("/rides/current");
                if (rideRes.data?.data) {
                    const status = rideRes.data.data.status;
                    if (status === "accepted" || status === "arriving" || status === "started") {
                        router.replace("/(driver)/active-ride");
                        return;
                    }
                }
            } catch (err) {
                // Ignore errors and continue fetching profile
            }

            const profileRes = await getDriverProfile();
            if (profileRes?.data) setUser(profileRes.data.user);
            const statusData = await getDriverStatus();
            setDriverState(statusData);
        } catch {
            setUser({ fullname: "RideSync Driver", username: "driver", role: "driver", avatar: null });
            setDriverState({ status: "offline", isActive: false, driverVerified: "pending", verificationNote: null });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const profileRes = await getDriverProfile();
            if (profileRes?.data) setUser(profileRes.data.user);
            const statusData = await getDriverStatus();
            setDriverState(statusData);
        } catch { /* non-critical */ }
        finally { setRefreshing(false); }
    };

    const handleToggleStatus = async (value: boolean) => {
        if (!driverState?.isActive || driverState?.driverVerified !== "verified") {
            Alert.alert("Access Locked", "Complete verification before going online.");
            return;
        }
        const newStatus = value ? "available" : "offline";
        try {
            setTogglingStatus(true);
            const res = await updateDriverStatus(newStatus);
            if (res?.data) setDriverState((p: any) => ({ ...p, status: res.data.status }));
        } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to update status.");
        } finally {
            setTogglingStatus(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "DR";
        const parts = name.split(" ");
        return parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();
    };

    const isOnline = driverState?.status === "available";
    const isVerified = driverState?.driverVerified === "verified" && driverState?.isActive;

    // ── Track location while online ───────────────────────────────────────────
    useDriverLocation({ isActive: isOnline });

    useEffect(() => {
        if (!isOnline) return;

        // 1. Check for existing available rides
        const checkAvailable = async () => {
            try {
                const res = await api.get("/rides/available");
                if (res.data?.data && res.data.data.length > 0) {
                    router.push({
                        pathname: "/(driver)/ride-request-modal",
                        params: { requestData: JSON.stringify(res.data.data[0]) }
                    });
                }
            } catch (e) {
                console.log("No available rides or error");
            }
        };
        checkAvailable();

        // 2. Listen for new incoming ride requests
        let offNewRide: (() => void) | undefined;
        let socketSetupCancelled = false;
        const setupSocket = async () => {
            try {
                const token = await getAccessToken();
                if (socketSetupCancelled) return; // effect cleaned up while awaiting
                if (token) connectSocket(token);

                offNewRide = onNewRideRequest((payload) => {
                    router.push({
                        pathname: "/(driver)/ride-request-modal",
                        params: { requestData: JSON.stringify(payload) }
                    });
                });
            } catch (err) {
                console.warn("Socket initialization error:", err);
            }
        };

        setupSocket();

        return () => {
            socketSetupCancelled = true;
            if (offNewRide) offNewRide();
        };
    }, [isOnline]);


    if (loading) {
        return (
            <View className="flex-1 bg-[#070B12] items-center justify-center">
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <ActivityIndicator size="large" color="#11E0C5" />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Glow background */}
            <View className="absolute inset-0 overflow-hidden">
                <View className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full" style={{ backgroundColor: COLORS.glowPrimary }} />
                <View className="absolute top-[280px] -left-20 w-[240px] h-[240px] rounded-full" style={{ backgroundColor: COLORS.glowBlue }} />
                <View className="absolute bottom-[-100px] right-[-50px] w-[300px] h-[300px] rounded-full bg-[#11E0C5]/5" />
                <View className="absolute top-[-20px] right-[-40px] w-[260px] h-[260px] rounded-full items-center justify-center" style={{ backgroundColor: COLORS.glowRing }}>
                    <View className="w-[190px] h-[190px] rounded-full bg-[#1D6B61]/15" />
                </View>
            </View>

            <SafeAreaView className="flex-1 px-5 pt-3">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#11E0C5" colors={["#11E0C5"]} />
                    }
                >
                    {/* ── Header ───────────────────────────────────────────── */}
                    <View className="flex-row items-center justify-between mt-3 mb-6">
                        <View className="flex-1 pr-4">
                            <Text className="text-[#748096] text-[14px] font-medium uppercase tracking-wider">
                                {greeting}
                            </Text>
                            <Text className="text-white text-[28px] font-bold tracking-tight mt-1" numberOfLines={1}>
                                {user?.fullname || "RideSync Driver"}
                            </Text>
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(driver)/profile")}
                            accessibilityRole="button"
                            accessibilityLabel="Go to profile"
                            className="relative"
                        >
                            <View className="w-14 h-14 rounded-full border border-[#11E0C5]/40 items-center justify-center bg-[#131D2B]">
                                {user?.avatar?.url ? (
                                    <Image source={{ uri: user.avatar.url }} className="w-full h-full rounded-full" />
                                ) : (
                                    <Text className="text-[#11E0C5] text-[16px] font-bold">{getInitials(user?.fullname)}</Text>
                                )}
                            </View>
                            <View className={`absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full border-2 border-[#070B12] ${isVerified ? "bg-[#10B981]" : "bg-red-500"}`} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Verification banner ──────────────────────────────── */}
                    {driverState?.driverVerified !== "verified" && (
                        <VerificationBanner
                            driverVerified={driverState?.driverVerified}
                            verificationNote={driverState?.verificationNote}
                        />
                    )}

                    {/* ── Availability toggle ──────────────────────────────── */}
                    <View className={`${glassCard} p-5 shadow-xl mb-5`}>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isOnline ? "bg-[#10B981]/10" : "bg-red-500/10"}`}>
                                    <Feather name="power" size={18} color={isOnline ? "#10B981" : "#EF4444"} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[#748096] text-[11px] uppercase tracking-wider">Duty Status</Text>
                                    <Text className="text-white text-[16px] font-bold mt-0.5">
                                        {isOnline ? "Online & Available" : "Offline"}
                                    </Text>
                                </View>
                            </View>
                            {togglingStatus ? (
                                <ActivityIndicator size="small" color="#11E0C5" />
                            ) : (
                                <Switch
                                    value={isOnline}
                                    onValueChange={handleToggleStatus}
                                    trackColor={{ false: "#1A2536", true: "#11E0C550" }}
                                    thumbColor={isOnline ? "#11E0C5" : "#748096"}
                                    disabled={driverState?.driverVerified !== "verified" || togglingStatus}
                                    accessibilityRole="switch"
                                    accessibilityLabel="Toggle availability"
                                />
                            )}
                        </View>
                    </View>

                    {/* ── Stats row ────────────────────────────────────────── */}
                    <View className="flex-row gap-x-3 mb-5">
                        <StatCard label="Today's Earnings" value="₹0" sub="Start driving" />
                        <StatCard label="Rides Today" value="0" sub="No rides yet" />
                        <StatCard label="Acceptance Rate" value="—" sub="Go online first" />
                    </View>

                    {/* ── Live request state ───────────────────────────────── */}
                    <Text className="text-white text-[18px] font-bold mb-4 px-1">
                        Live Requests
                    </Text>

                    {isOnline ? (
                        <EmptyStateCard
                            icon="radio"
                            iconColor="#11E0C5"
                            title="Scanning for nearby rides…"
                            subtitle="Keep the app open. You'll be notified the moment a rider books a trip near you."
                            minHeight={150}
                            className="mb-5"
                        />
                    ) : (
                        <EmptyStateCard
                            icon="moon"
                            iconColor="#748096"
                            title="You're offline"
                            subtitle={
                                driverState?.driverVerified === "verified"
                                    ? "Toggle the duty switch on to start receiving ride requests."
                                    : "Complete your document upload and wait for admin approval to go online."
                            }
                            minHeight={150}
                            className="mb-5"
                        />
                    )}

                    {/* ── Recent activity ──────────────────────────────────── */}
                    <View className="flex-row items-center justify-between mb-4 px-1">
                        <Text className="text-white text-[18px] font-bold">Recent Activity</Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push("/(driver)/rides")}
                            accessibilityRole="button"
                            accessibilityLabel="See all rides"
                        >
                            <Text className="text-[#11E0C5] text-[13px] font-semibold">See All</Text>
                        </TouchableOpacity>
                    </View>

                    {recentRides.length === 0 ? (
                        <EmptyStateCard
                            icon="clock"
                            iconColor="#748096"
                            title="No activity yet"
                            subtitle="Your completed rides and earnings will appear here after your first trip."
                            minHeight={120}
                        />
                    ) : (
                        // TODO: render RideHistoryCard for each recent ride
                        null
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Mini stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <View className={`${glassCard} flex-1 p-4 items-center`}>
            <Text className="text-[#748096] text-[10px] text-center uppercase tracking-wide leading-4">
                {label}
            </Text>
            <Text className="text-white text-[18px] font-bold mt-1">{value}</Text>
            <Text className="text-[#748096] text-[10px] mt-0.5">{sub}</Text>
        </View>
    );
}
