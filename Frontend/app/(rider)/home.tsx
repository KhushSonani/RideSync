import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from "@/services/api";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";

export default function HomeScreen() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState("Welcome back");

    useEffect(() => {
        // Set dynamic greeting based on time of day
        const hours = new Date().getHours();
        if (hours < 12) setGreeting("Good morning");
        else if (hours < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        await fetchUserProfile();
        setLoading(false);
    };

    const fetchUserProfile = async () => {
        try {
            const response = await api.get('/users/profile');
            console.log("PROFILE RESPONSE:", response.data);
            if (response.data?.data) {
                setUser(response.data.data);
            }
        } catch (error) {
            const err = error as any;
            console.log("FETCH PROFILE ERROR:", err?.response?.data || err.message);
            // Non-blocking fallback to mock user for testing visual designs
            setUser({
                fullname: "Khush Sonani",
                username: "khush_sonani",
                email: "khush@ridesync.com",
                role: "rider",
                avatar: null
            });
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUserProfile();
        setRefreshing(false);
    };

    // Helper to get user initials for avatar fallback
    const getInitials = (name: string) => {
        if (!name) return "RS";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

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
                {/* Bottom Right Subtle Glow */}
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
                                {user?.fullname || "RideSync User"}
                            </Text>
                        </View>

                        {/* PREMIUM AVATAR */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(rider)/profile")}
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
                            {/* Online/Active status dot */}
                            <View className="absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full bg-[#10B981] border-2 border-[#070B12]" />
                        </TouchableOpacity>
                    </View>

                    {/* QUICK STATS/DASHBOARD CARD */}
                    <View className={`${glassCard} p-5 shadow-xl mb-6`}>
                        <View className="flex-row items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-lg bg-[#11E0C5]/10 items-center justify-center mr-3">
                                    <Feather name="shield" size={16} color="#11E0C5" />
                                </View>
                                <View>
                                    <Text className="text-[#748096] text-[11px] uppercase tracking-wider">Account Role</Text>
                                    <Text className="text-white text-[15px] font-semibold mt-0.5 capitalize">
                                        {user?.role || "Rider"}
                                    </Text>
                                </View>
                            </View>
                            <View className="bg-[#11E0C5]/10 border border-[#11E0C5]/20 px-3 py-1 rounded-full">
                                <Text className="text-[#11E0C5] text-[11px] font-bold capitalize">
                                    {user?.role === "driver" ? "Driver Mode" : "Rider Mode"}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <View className="flex-1 items-center border-r border-white/[0.05]">
                                <Text className="text-[#748096] text-xs">Rating</Text>
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="star" size={15} color="#FFC107" />
                                    <Text className="text-white text-base font-bold ml-1">4.9</Text>
                                </View>
                            </View>
                            <View className="flex-1 items-center border-r border-white/[0.05]">
                                <Text className="text-[#748096] text-xs">Rides</Text>
                                <Text className="text-white text-base font-bold mt-1">18</Text>
                            </View>
                            <View className="flex-1 items-center">
                                <Text className="text-[#748096] text-xs">Status</Text>
                                <Text className="text-[#11E0C5] text-sm font-bold mt-1">Verified</Text>
                            </View>
                        </View>
                    </View>

                    {/* MAIN QUICK ACTIONS */}
                    <Text className="text-white text-[18px] font-bold mb-4 px-1">
                        Where to go?
                    </Text>

                    <View className="flex-row gap-x-4 mb-6">
                        {/* REQUEST RIDE CARD */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(rider)/rides")}
                            className={`${glassCard} flex-1 p-4 items-start shadow-md`}
                        >
                            <View className="w-10 h-10 rounded-xl bg-[#11E0C5]/10 items-center justify-center mb-3">
                                <Ionicons name="car-sport" size={20} color="#11E0C5" />
                            </View>
                            <Text className="text-white text-[15px] font-bold">Request Ride</Text>
                            <Text className="text-[#748096] text-[11px] mt-1 leading-4">
                                Book a premium ride to your destination
                            </Text>
                        </TouchableOpacity>

                        {/* SHARE RIDE CARD */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (user?.role === "rider") {
                                    Alert.alert(
                                        "Driver Role Required",
                                        "To publish or share a ride, you need a driver account. Update your role in your profile.",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Go to Profile", onPress: () => router.push("/(rider)/profile") }
                                        ]
                                    );
                                } else {
                                    router.push("/(rider)/rides");
                                }
                            }}
                            className={`${glassCard} flex-1 p-4 items-start shadow-md`}
                        >
                            <View className="w-10 h-10 rounded-xl bg-[#0A84FF]/10 items-center justify-center mb-3">
                                <MaterialCommunityIcons name="map-marker-distance" size={20} color="#0A84FF" />
                            </View>
                            <Text className="text-white text-[15px] font-bold">Share Ride</Text>
                            <Text className="text-[#748096] text-[11px] mt-1 leading-4">
                                Publish empty seats and share travel costs
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* RECENT ACTIVITY SECTION */}
                    <View className="flex-row items-center justify-between mb-4 px-1">
                        <Text className="text-white text-[18px] font-bold">
                            Recent Rides
                        </Text>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/(rider)/rides")}>
                            <Text className="text-[#11E0C5] text-xs font-semibold">See All</Text>
                        </TouchableOpacity>
                    </View>

                    {/* MOCK RIDES FEED FOR GORGEOUS AESTHETICS */}
                    <View className="gap-y-3">
                        <View className={`${glassCard} p-4 flex-row items-center justify-between`}>
                            <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-10 h-10 rounded-full bg-[#131D2B] items-center justify-center mr-3 border border-white/[0.04]">
                                    <Ionicons name="map-outline" size={18} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>
                                        Downtown to Airport Terminal
                                    </Text>
                                    <Text className="text-[#748096] text-[11px] mt-0.5">
                                        May 24, 2026 • 10:30 AM
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-white text-[14px] font-bold">$24.50</Text>
                                <Text className="text-[#10B981] text-[10px] font-semibold mt-1 bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                                    Completed
                                </Text>
                            </View>
                        </View>

                        <View className={`${glassCard} p-4 flex-row items-center justify-between`}>
                            <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-10 h-10 rounded-full bg-[#131D2B] items-center justify-center mr-3 border border-white/[0.04]">
                                    <Ionicons name="map-outline" size={18} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>
                                        Corporate Park to Greenfields
                                    </Text>
                                    <Text className="text-[#748096] text-[11px] mt-0.5">
                                        May 22, 2026 • 6:15 PM
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-white text-[14px] font-bold">$18.20</Text>
                                <Text className="text-[#10B981] text-[10px] font-semibold mt-1 bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                                    Completed
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
