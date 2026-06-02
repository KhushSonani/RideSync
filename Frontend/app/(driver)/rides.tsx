import React from "react";
import { View, Text, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { router } from "expo-router";

import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";

export default function DriverRideTracking() {
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
                    className="absolute bottom-[-100px] -left-20 w-[300px] h-[300px] rounded-full bg-[#11E0C5]/5"
                />
            </View>

            {/* FULL SCREEN MAP CONTAINER PLACEHOLDER */}
            <View className="flex-1 bg-[#131D2B] relative">
                {/* Fake map graphics using styling */}
                <View className="absolute inset-0 items-center justify-center">
                    <Feather name="map" size={48} color="#748096" opacity={0.3} />
                    <Text className="text-[#748096] text-xs font-semibold mt-2">Live Map Interface Placeholder</Text>
                </View>

                {/* Top float back button */}
                <SafeAreaView className="absolute top-4 left-4 z-10">
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-[#0D1420]/90 border border-white/10 items-center justify-center shadow-lg"
                    >
                        <Feather name="arrow-left" size={18} color="white" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Bottom Slide Up card for tracking */}
                <View className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <View className={`${glassCard} p-5 shadow-2xl`}>
                        {/* HEADER: TRIP STATS */}
                        <View className="flex-row items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                            <View>
                                <Text className="text-[#748096] text-[10px] uppercase tracking-wider">Estimated Arrival</Text>
                                <Text className="text-white text-lg font-bold mt-0.5">8 minutes</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-[#748096] text-[10px] uppercase tracking-wider">Distance</Text>
                                <Text className="text-[#11E0C5] text-lg font-bold mt-0.5">3.2 km</Text>
                            </View>
                            <View className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                                <Text className="text-[#11E0C5] text-xs font-bold uppercase tracking-wider">OTP: 4921</Text>
                            </View>
                        </View>

                        {/* RIDER INFO CARD */}
                        <View className="flex-row items-center justify-between mb-5">
                            <View className="flex-row items-center">
                                <View className="w-11 h-11 rounded-full bg-[#131D2B] border border-white/15 items-center justify-center">
                                    <Text className="text-[#11E0C5] font-bold">AK</Text>
                                </View>
                                <View className="ml-3">
                                    <Text className="text-white font-bold text-sm">Amelia K.</Text>
                                    <Text className="text-[#748096] text-xs mt-0.5">⭐ 4.95 Rating</Text>
                                </View>
                            </View>

                            <View className="flex-row gap-x-2">
                                <TouchableOpacity className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                                    <Feather name="phone" size={16} color="#11E0C5" />
                                </TouchableOpacity>
                                <TouchableOpacity className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                                    <Feather name="message-square" size={16} color="#11E0C5" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ADRESS DETAILS */}
                        <View className="mb-6 gap-y-3">
                            <View className="flex-row items-start">
                                <View className="w-2.5 h-2.5 rounded-full bg-[#11E0C5] mt-1 mr-3" />
                                <View className="flex-1">
                                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider">Pickup</Text>
                                    <Text className="text-white text-xs mt-0.5" numberOfLines={1}>742 Evergreen Terrace, Springfield</Text>
                                </View>
                            </View>
                            <View className="flex-row items-start">
                                <View className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 mr-3" />
                                <View className="flex-1">
                                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider">Destination</Text>
                                    <Text className="text-white text-xs mt-0.5" numberOfLines={1}>Downtown Central Station, Springfield</Text>
                                </View>
                            </View>
                        </View>

                        {/* ACTION BUTTONS */}
                        <View className="flex-row gap-x-3">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="flex-1 h-12 bg-red-500/10 border border-red-500/20 rounded-xl items-center justify-center"
                            >
                                <Text className="text-red-400 text-xs font-bold">Cancel Ride</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="flex-1 h-12 bg-[#11E0C5] rounded-xl items-center justify-center"
                            >
                                <Text className="text-[#071018] text-xs font-bold">Complete Ride</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
