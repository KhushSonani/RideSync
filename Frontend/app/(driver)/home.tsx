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
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { getDriverStatus, getDriverProfile, updateDriverStatus } from "@/services/driver";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import VerificationBanner from "@/components/VerificationBanner";

export default function DriverHome() {
    const [user, setUser] = useState<any>(null);
    const [driverState, setDriverState] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState("Welcome back");
    const [togglingStatus, setTogglingStatus] = useState(false);

    useEffect(() => {
        const hours = new Date().getHours();
        if (hours < 12) setGreeting("Good morning");
        else if (hours < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const profileResponse = await getDriverProfile();
            if (profileResponse?.data) {
                setUser(profileResponse.data.user);
            }
            const statusData = await getDriverStatus();
            setDriverState(statusData);
        } catch (error) {
            console.log("DRIVER FETCH DATA ERROR:", error);
            // Mock fallback values for visual testing
            setUser({
                fullname: "Khush Sonani",
                username: "khush_sonani",
                email: "driver@ridesync.com",
                role: "driver",
                avatar: null
            });
            setDriverState({
                status: "offline",
                isActive: false,
                driverVerified: "pending",
                verificationNote: null,
                vehicleVerified: "pending"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const profileResponse = await getDriverProfile();
            if (profileResponse?.data) {
                setUser(profileResponse.data.user);
            }
            const statusData = await getDriverStatus();
            setDriverState(statusData);
        } catch (error) {
            console.log("DRIVER REFRESH ERROR:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleToggleStatus = async (value: boolean) => {
        if (!driverState?.isActive || driverState?.driverVerified !== "verified") {
            Alert.alert(
                "Access Locked",
                "You cannot go online until your account is fully verified by our admin team."
            );
            return;
        }

        const newStatus = value ? "available" : "offline";
        try {
            setTogglingStatus(true);
            const response = await updateDriverStatus(newStatus);
            if (response?.data) {
                setDriverState((prev: any) => ({
                    ...prev,
                    status: response.data.status
                }));
            }
        } catch (error: any) {
            console.log("UPDATE STATUS ERROR:", error?.response?.data || error.message);
            Alert.alert("Error", error?.response?.data?.message || "Failed to update availability status.");
        } finally {
            setTogglingStatus(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "DR";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const isOnline = driverState?.status === "available";
    const isVerified = driverState?.driverVerified === "verified" && driverState?.isActive;

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

            <SafeAreaView className="flex-1 px-5 pt-3">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#11E0C5"
                            colors={["#11E0C5"]}
                        />
                    }
                >
                    {/* HEADER: GREETING & AVATAR */}
                    <View className="flex-row items-center justify-between mt-3 mb-6">
                        <View className="flex-1 pr-4">
                            <Text className="text-[#748096] text-[14px] font-medium uppercase tracking-wider">
                                {greeting}
                            </Text>
                            <Text className="text-white text-[28px] font-bold tracking-tight mt-1" numberOfLines={1}>
                                {user?.fullname || "RideSync Driver"}
                            </Text>
                        </View>

                        {/* PREMIUM AVATAR */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(driver)/profile")}
                            className="relative"
                        >
                            <View className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#11E0C5] to-[#0A84FF] border border-[#11E0C5]/40 items-center justify-center shadow-lg">
                                {user?.avatar?.url ? (
                                    <Image
                                        source={{ uri: user.avatar.url }}
                                        className="w-full h-full rounded-full"
                                    />
                                ) : (
                                    <View className="w-full h-full rounded-full bg-[#131D2B] items-center justify-center">
                                        <Text className="text-[#11E0C5] text-[16px] font-bold tracking-wide">
                                            {getInitials(user?.fullname)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {/* Verification status dot */}
                            <View className={`absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full border-2 border-[#070B12] ${isVerified ? "bg-[#10B981]" : "bg-red-500"}`} />
                        </TouchableOpacity>
                    </View>

                    {/* VERIFICATION BANNER */}
                    {driverState?.driverVerified !== "verified" && (
                        <VerificationBanner
                            driverVerified={driverState?.driverVerified}
                            verificationNote={driverState?.verificationNote}
                        />
                    )}

                    {/* AVAILABILITY STATUS CARD */}
                    <View className={`${glassCard} p-5 shadow-xl mb-6`}>
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
                                <ActivityIndicator size="small" color="#11E0C5" className="mr-3" />
                            ) : (
                                <Switch
                                    value={isOnline}
                                    onValueChange={handleToggleStatus}
                                    trackColor={{ false: "#1A2536", true: "#11E0C5/50" }}
                                    thumbColor={isOnline ? "#11E0C5" : "#748096"}
                                    disabled={driverState?.driverVerified !== "verified" || togglingStatus}
                                />
                            )}
                        </View>
                    </View>

                    {/* QUICK STATS */}
                    <View className="flex-row gap-x-4 mb-6">
                        <View className={`${glassCard} flex-1 p-4 items-center`}>
                            <Text className="text-[#748096] text-xs">{"Today's Earnings"}</Text>
                            <Text className="text-white text-[20px] font-bold mt-1">$0.00</Text>
                        </View>
                        <View className={`${glassCard} flex-1 p-4 items-center`}>
                            <Text className="text-[#748096] text-xs">Rides Completed</Text>
                            <Text className="text-white text-[20px] font-bold mt-1">0</Text>
                        </View>
                        <View className={`${glassCard} flex-1 p-4 items-center`}>
                            <Text className="text-[#748096] text-xs">Acceptance Rate</Text>
                            <Text className="text-white text-[20px] font-bold mt-1">100%</Text>
                        </View>
                    </View>

                    {/* INCOMING RIDE REQUESTS */}
                    <Text className="text-white text-[18px] font-bold mb-4 px-1">
                        Active Ride Requests
                    </Text>

                    {isOnline ? (
                        <View className={`${glassCard} p-6 items-center justify-center min-h-[140px] mb-6`}>
                            <MaterialCommunityIcons name="radar" size={32} color="#11E0C5" className="animate-pulse" />
                            <Text className="text-white text-[15px] font-bold mt-3">Scanning for nearby rides...</Text>
                            <Text className="text-[#748096] text-xs mt-1 text-center max-w-[240px]">
                                Keep this app open. You will be notified here as soon as a rider books a trip near you.
                            </Text>
                        </View>
                    ) : (
                        <View className={`${glassCard} p-6 items-center justify-center min-h-[140px] mb-6`}>
                            <Feather name="moon" size={28} color="#667085" />
                            <Text className="text-white text-[15px] font-bold mt-3">You are offline</Text>
                            <Text className="text-[#748096] text-xs mt-1 text-center max-w-[240px]">
                                {driverState?.driverVerified === "verified"
                                    ? "Switch the duty status toggle on to start receiving live ride requests."
                                    : "Complete document upload and wait for admin approval to go online."
                                }
                            </Text>
                        </View>
                    )}

                    {/* RECENT ACTIVITY */}
                    <View className="flex-row items-center justify-between mb-4 px-1">
                        <Text className="text-white text-[18px] font-bold">
                            Recent Activity
                        </Text>
                        <TouchableOpacity activeOpacity={0.7}>
                            <Text className="text-[#11E0C5] text-xs font-semibold">See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className={`${glassCard} p-5 items-center justify-center min-h-[100px]`}>
                        <Text className="text-[#748096] text-sm">No recent rides found.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
