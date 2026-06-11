import React, { useState } from "react";
import {
    View,
    Text,
    StatusBar,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";

// TODO: replace with real data from GET /rides/history?role=driver
const MOCK_EMPTY = true;
const MOCK_RIDES: any[] = [];

export default function DriverRidesScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState("All");

    const handleRefresh = async () => {
        setRefreshing(true);
        // TODO: refetch driver ride history from API
        setTimeout(() => setRefreshing(false), 1200);
    };

    // TODO: compute from real data
    const totalEarnings = "₹0";
    const totalRides    = 0;

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Glow background */}
            <View className="absolute inset-0 overflow-hidden">
                <View
                    className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />
                <View
                    className="absolute bottom-[-100px] -left-20 w-[300px] h-[300px] rounded-full bg-[#11E0C5]/5"
                />
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
                    {/* Header */}
                    <View className="flex-row items-center mt-1 mb-6">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            className="p-2 -ml-2"
                        >
                            <Feather name="arrow-left" size={20} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-[24px] italic ml-4 tracking-wide">
                            my rides
                        </Text>
                    </View>

                    {/* Earnings summary card */}
                    <View className={`${glassCard} p-5 mb-5 flex-row`}>
                        <View className="flex-1 items-center border-r border-white/[0.05] pr-4">
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-1">
                                Total Earned
                            </Text>
                            <Text className="text-white text-[22px] font-bold">
                                {totalEarnings}
                            </Text>
                            <Text className="text-[#748096] text-[10px] mt-0.5">
                                Lifetime earnings
                            </Text>
                        </View>
                        <View className="flex-1 items-center pl-4">
                            <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-1">
                                Rides Done
                            </Text>
                            <Text className="text-white text-[22px] font-bold">
                                {totalRides}
                            </Text>
                            <Text className="text-[#748096] text-[10px] mt-0.5">
                                Total completed
                            </Text>
                        </View>
                    </View>

                    {/* Filter chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 8 }}
                        className="mb-5 -mx-1"
                    >
                        {FILTERS.map((f) => {
                            const active = f === activeFilter;
                            return (
                                <TouchableOpacity
                                    key={f}
                                    activeOpacity={0.7}
                                    onPress={() => setActiveFilter(f)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filter by ${f}`}
                                    className={`mr-2 px-4 py-2 rounded-full border ${
                                        active
                                            ? "bg-[#11E0C5]/10 border-[#11E0C5]/30"
                                            : "bg-white/[0.03] border-white/[0.08]"
                                    }`}
                                >
                                    <Text
                                        className={`text-[12px] font-semibold ${
                                            active ? "text-[#11E0C5]" : "text-[#748096]"
                                        }`}
                                    >
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Content */}
                    {MOCK_EMPTY || MOCK_RIDES.length === 0 ? (
                        <EmptyStateCard
                            icon="briefcase"
                            iconColor="#11E0C5"
                            title="No rides yet"
                            subtitle="Go online and complete your first ride. Your earnings and trip history will appear here."
                            ctaLabel="Go to Dashboard"
                            onCtaPress={() => router.back()}
                            minHeight={220}
                        />
                    ) : (
                        <View className="gap-y-3">
                            {MOCK_RIDES.map((ride, i) => (
                                <RideHistoryCard
                                    key={ride._id ?? i}
                                    pickup={ride.pickup?.address ?? "Pickup"}
                                    drop={ride.drop?.address ?? "Destination"}
                                    date={ride.createdAt ?? ""}
                                    fare={`₹${ride.fare ?? 0}`}
                                    status={ride.status}
                                    personName={ride.rider?.fullname}
                                    distance={ride.distance ? `${ride.distance} km` : undefined}
                                    onPress={() => {
                                        // TODO: navigate to ride detail
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const FILTERS = ["All", "Completed", "Cancelled"];
