import React, { useState, useEffect } from "react";
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
import { useTheme } from "@/store/ThemeContext";

import { COLORS } from "@/constants/theme";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";

import { api } from "@/services/api";

export default function RiderRidesScreen() {
    const { theme } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");

    const fetchRides = async () => {
        try {
            const res = await api.get("/rides/history");
            if (res.data?.data?.rides) {
                setRides(res.data.data.rides);
            }
        } catch (error) {
            console.error("Failed to fetch rides:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRides();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRides();
        setRefreshing(false);
    };

    const filteredRides = rides.filter(ride => {
        if (activeFilter === "All") return true;
        if (activeFilter === "Completed") return ride.status === "completed";
        if (activeFilter === "Cancelled") return ride.status === "cancelled";
        if (activeFilter === "In Progress") return ["requested", "accepted", "arriving", "started"].includes(ride.status);
        return true;
    });

    return (
        <View className="flex-1 bg-background">
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
                    contentContainerStyle={{ paddingBottom: 90 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
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
                        <Text className="text-foreground text-[24px] italic ml-4 tracking-wide">
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
                                onPress={() => setActiveFilter(f)}
                                accessibilityRole="button"
                                accessibilityLabel={`Filter by ${f}`}
                                className={`mr-2 px-4 py-2 rounded-full border ${
                                    f === activeFilter
                                        ? "bg-primary/10 border-primary/30"
                                        : "bg-foreground/[0.03] border-border"
                                }`}
                            >
                                <Text
                                    className={`text-[12px] font-semibold ${
                                        f === activeFilter ? "text-primary" : "text-muted"
                                    }`}
                                >
                                    {f}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Content */}
                    {!loading && filteredRides.length === 0 ? (
                        <EmptyStateCard
                            icon="map"
                            iconColor={theme.colors.primary}
                            title={rides.length === 0 ? "No rides yet" : `No ${activeFilter.toLowerCase()} rides`}
                            subtitle={rides.length === 0 ? "Your completed and upcoming rides will appear here once you book your first trip." : ""}
                            ctaLabel={rides.length === 0 ? "Book a Ride" : undefined}
                            onCtaPress={() => router.push("/(rider)/create-ride")}
                            minHeight={220}
                        />
                    ) : (
                        <View className="gap-y-3">
                            {filteredRides.map((ride, i) => (
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
                                        if (["requested", "accepted", "arriving", "started"].includes(ride.status)) {
                                            router.replace("/(rider)/home");
                                        }
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
