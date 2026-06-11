import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DriverInfo } from "@/services/socket.types";

interface DriverInfoCardProps {
    driver: DriverInfo;
    /** Called when the user taps the phone icon (TODO: deep-link to dialler) */
    onCallPress?: () => void;
    /** Called when the user taps the message icon (TODO: open in-app chat) */
    onMessagePress?: () => void;
}

function getInitials(name: string): string {
    if (!name) return "DR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

/**
 * Shows driver avatar initials, full name, rating, vehicle make/model, and plate.
 * Includes call and message icon buttons whose handlers are left empty for
 * business logic wiring.
 */
const DriverInfoCard = memo(function DriverInfoCard({
    driver,
    onCallPress,
    onMessagePress,
}: DriverInfoCardProps) {
    const driverUser =
        driver.user && typeof driver.user === "object" ? driver.user : null;
    const fullname = driverUser?.fullname ?? "Driver";
    const vehicle = driver.vehicle;

    return (
        <View className="flex-row items-center justify-between">
            {/* Avatar + info */}
            <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-full bg-[#131D2B] border border-white/15 items-center justify-center flex-shrink-0">
                    <Text className="text-[#11E0C5] font-bold text-[14px]">
                        {getInitials(fullname)}
                    </Text>
                </View>

                <View className="ml-3 flex-1">
                    <Text
                        className="text-white font-bold text-[14px]"
                        numberOfLines={1}
                    >
                        {fullname}
                    </Text>
                    <Text className="text-[#748096] text-[11px] mt-0.5">
                        ⭐ 4.9
                        {vehicle
                            ? `  ·  ${vehicle.make} ${vehicle.model}`
                            : "  ·  Vehicle details pending"}
                    </Text>
                    {vehicle ? (
                        <Text className="text-[#11E0C5] text-[10px] mt-[3px] font-semibold uppercase tracking-wider">
                            {vehicle.color} · {vehicle.plate}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-x-2">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onCallPress}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center"
                    accessibilityLabel="Call driver"
                    accessibilityRole="button"
                >
                    <Feather name="phone" size={16} color="#11E0C5" />
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onMessagePress}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center"
                    accessibilityLabel="Message driver"
                    accessibilityRole="button"
                >
                    <Feather name="message-square" size={16} color="#11E0C5" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default DriverInfoCard;
