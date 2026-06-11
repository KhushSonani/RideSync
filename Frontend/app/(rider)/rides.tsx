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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";

// TODO: replace with real data from GET /rides/history
const MOCK_EMPTY = true;
const MOCK_RIDES: any[] = [];

export default function RiderRidesScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        // TODO: refetch rides from API
        setTimeout(() => setRefreshing(false), 1200);
    };

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
                    className="absolute top-[280px] -left-20 w-[240px] h-[240px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
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

                    {/* Filter chips — TODO: implement active filter state + API params */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 8 }}
                        className="mb-5 -mx-1"
                    >
                        {FILTERS.map((f) => (
                            <TouchableOpacity
                                key={f}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`Filter by ${f}`}
                                className={`mr-2 px-4 py-2 rounded-full border ${
                                    f === "All"
                                        ? "bg-[#11E0C5]/10 border-[#11E0C5]/30"
                                        : "bg-white/[0.03] border-white/[0.08]"
                                }`}
                            >
                                <Text
                                    className={`text-[12px] font-semibold ${
                                        f === "All" ? "text-[#11E0C5]" : "text-[#748096]"
                                    }`}
                                >
                                    {f}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Content */}
                    {MOCK_EMPTY || MOCK_RIDES.length === 0 ? (
                        <EmptyStateCard
                            icon="map"
                            iconColor="#11E0C5"
                            title="No rides yet"
                            subtitle="Your completed and upcoming rides will appear here once you book your first trip."
                            ctaLabel="Book a Ride"
                            onCtaPress={() => router.push("/(rider)/create-ride")}
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
                                    personName={ride.driver?.user?.fullname}
                                    distance={ride.distance ? `${ride.distance} km` : undefined}
                                    onPress={() => {
                                        // TODO: navigate to ride detail screen
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

const FILTERS = ["All", "Completed", "Cancelled", "In Progress"];
