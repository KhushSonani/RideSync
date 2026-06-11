import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { glassCard } from "@/constants/styles";

type RideStatus =
    | "requested"
    | "accepted"
    | "arriving"
    | "started"
    | "completed"
    | "cancelled";

interface RideHistoryCardProps {
    pickup: string;
    drop: string;
    date: string;            // Pre-formatted display string, e.g. "May 24, 2026 • 10:30 AM"
    fare: string;            // Pre-formatted, e.g. "₹124"
    status: RideStatus;
    /** Rider-facing: driver name. Driver-facing: rider name. */
    personName?: string;
    distance?: string;       // e.g. "3.2 km"
    onPress?: () => void;
}

const STATUS_CONFIG: Record<
    RideStatus,
    { label: string; color: string; bg: string }
> = {
    requested:  { label: "Requested",  color: "#F59E0B", bg: "#F59E0B14" },
    accepted:   { label: "Accepted",   color: "#3B82F6", bg: "#3B82F614" },
    arriving:   { label: "Arriving",   color: "#0A84FF", bg: "#0A84FF14" },
    started:    { label: "In Progress",color: "#11E0C5", bg: "#11E0C514" },
    completed:  { label: "Completed",  color: "#10B981", bg: "#10B98114" },
    cancelled:  { label: "Cancelled",  color: "#EF4444", bg: "#EF444414" },
};

const RideHistoryCard = memo(function RideHistoryCard({
    pickup,
    drop,
    date,
    fare,
    status,
    personName,
    distance,
    onPress,
}: RideHistoryCardProps) {
    const { label, color, bg } = STATUS_CONFIG[status] ?? STATUS_CONFIG.completed;

    return (
        <TouchableOpacity
            activeOpacity={onPress ? 0.75 : 1}
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole="button"
            accessibilityLabel={`Ride from ${pickup} to ${drop}, ${label}`}
        >
            <View className={`${glassCard} p-4`}>
                {/* Top row: route + fare */}
                <View className="flex-row items-start justify-between mb-3">
                    {/* Route column */}
                    <View className="flex-1 pr-3">
                        {/* Pickup */}
                        <View className="flex-row items-center mb-2">
                            <View className="w-2.5 h-2.5 rounded-full bg-[#11E0C5] mr-2.5 mt-0.5" />
                            <Text
                                className="text-white text-[13px] font-semibold flex-1"
                                numberOfLines={1}
                            >
                                {pickup}
                            </Text>
                        </View>

                        {/* Connector line */}
                        <View className="w-[1px] h-3 bg-white/10 ml-[5px] mb-2" />

                        {/* Drop */}
                        <View className="flex-row items-center">
                            <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2.5 mt-0.5" />
                            <Text
                                className="text-white text-[13px] font-semibold flex-1"
                                numberOfLines={1}
                            >
                                {drop}
                            </Text>
                        </View>
                    </View>

                    {/* Fare */}
                    <View className="items-end">
                        <Text className="text-white text-[16px] font-bold">
                            {fare}
                        </Text>
                        {distance ? (
                            <Text className="text-[#748096] text-[11px] mt-0.5">
                                {distance}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Bottom row: date / person / status */}
                <View className="flex-row items-center justify-between border-t border-white/[0.05] pt-3">
                    <View className="flex-row items-center">
                        <Feather name="clock" size={11} color="#748096" />
                        <Text className="text-[#748096] text-[11px] ml-1.5">
                            {date}
                        </Text>
                        {personName ? (
                            <>
                                <View className="w-[1px] h-3 bg-white/10 mx-2" />
                                <Feather name="user" size={11} color="#748096" />
                                <Text className="text-[#748096] text-[11px] ml-1">
                                    {personName}
                                </Text>
                            </>
                        ) : null}
                    </View>

                    {/* Status badge */}
                    <View
                        className="px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: bg }}
                    >
                        <Text
                            className="text-[10px] font-bold"
                            style={{ color }}
                        >
                            {label}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default RideHistoryCard;
