import React, { useState } from "react";
import {
    View,
    Text,
    StatusBar,
    ScrollView,
    RefreshControl,
    TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";

export default function RidesScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    };

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
                    {/* BACK NAVIGATION */}
                    <View className="flex-row items-center mt-1 px-1 mb-6">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.back()}
                            className="p-2 -ml-2"
                        >
                            <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                        </TouchableOpacity>
                        <Text className="text-white text-[24px] italic ml-5 tracking-wide">
                            my rides
                        </Text>
                    </View>

                    {/* RIDES LIST */}
                    <View className="gap-y-4">
                        <View className={`${glassCard} p-5 flex-row items-center justify-between`}>
                            <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-12 h-12 rounded-full bg-[#131D2B] items-center justify-center mr-3 border border-white/[0.04]">
                                    <Ionicons name="map-outline" size={20} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-base font-bold" numberOfLines={1}>
                                        Downtown to Airport Terminal
                                    </Text>
                                    <Text className="text-[#748096] text-xs mt-1">
                                        May 24, 2026 • 10:30 AM
                                    </Text>
                                    <Text className="text-white/60 text-xs mt-1">
                                        Driver: Alexander K.
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end justify-between h-14">
                                <Text className="text-white text-base font-bold">$24.50</Text>
                                <Text className="text-[#10B981] text-[10px] font-bold mt-1 bg-[#10B981]/10 px-2.5 py-1 rounded-full border border-[#10B981]/25">
                                    Completed
                                </Text>
                            </View>
                        </View>

                        <View className={`${glassCard} p-5 flex-row items-center justify-between`}>
                            <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-12 h-12 rounded-full bg-[#131D2B] items-center justify-center mr-3 border border-white/[0.04]">
                                    <Ionicons name="map-outline" size={20} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-base font-bold" numberOfLines={1}>
                                        Corporate Park to Greenfields
                                    </Text>
                                    <Text className="text-[#748096] text-xs mt-1">
                                        May 22, 2026 • 6:15 PM
                                    </Text>
                                    <Text className="text-white/60 text-xs mt-1">
                                        Driver: Sarah M.
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end justify-between h-14">
                                <Text className="text-white text-base font-bold">$18.20</Text>
                                <Text className="text-[#10B981] text-[10px] font-bold mt-1 bg-[#10B981]/10 px-2.5 py-1 rounded-full border border-[#10B981]/25">
                                    Completed
                                </Text>
                            </View>
                        </View>

                        <View className={`${glassCard} p-5 flex-row items-center justify-between`}>
                            <View className="flex-row items-center flex-1 pr-3">
                                <View className="w-12 h-12 rounded-full bg-[#131D2B] items-center justify-center mr-3 border border-white/[0.04]">
                                    <Ionicons name="map-outline" size={20} color="#11E0C5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-base font-bold" numberOfLines={1}>
                                        High Street Shopping Center
                                    </Text>
                                    <Text className="text-[#748096] text-xs mt-1">
                                        May 19, 2026 • 2:40 PM
                                    </Text>
                                    <Text className="text-white/60 text-xs mt-1">
                                        Driver: David P.
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end justify-between h-14">
                                <Text className="text-white text-base font-bold">$12.80</Text>
                                <Text className="text-[#10B981] text-[10px] font-bold mt-1 bg-[#10B981]/10 px-2.5 py-1 rounded-full border border-[#10B981]/25">
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
