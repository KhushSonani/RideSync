import React, { memo } from "react";
import { View, Text } from "react-native";

interface LocationData {
    address: string;
}

interface RouteRowProps {
    pickup: LocationData;
    drop: LocationData;
}

/**
 * Displays a vertical pickup → destination route with dot indicators and a
 * connecting line. Used on ride request cards, active ride, and tracking screens.
 */
const RouteRow = memo(function RouteRow({ pickup, drop }: RouteRowProps) {
    return (
        <View className="gap-y-2">
            {/* Pickup */}
            <View className="flex-row items-start">
                <View className="items-center mr-3 mt-[3px]">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#11E0C5]" />
                    <View className="w-[1.5px] h-5 bg-white/10 mt-[3px]" />
                </View>
                <View className="flex-1 pb-1">
                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider mb-0.5">
                        Pickup
                    </Text>
                    <Text
                        className="text-white text-[13px] leading-4"
                        numberOfLines={1}
                    >
                        {pickup.address}
                    </Text>
                </View>
            </View>

            {/* Drop */}
            <View className="flex-row items-start">
                <View className="items-center mr-3 mt-[3px]">
                    <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </View>
                <View className="flex-1">
                    <Text className="text-[#748096] text-[10px] uppercase tracking-wider mb-0.5">
                        Destination
                    </Text>
                    <Text
                        className="text-white text-[13px] leading-4"
                        numberOfLines={1}
                    >
                        {drop.address}
                    </Text>
                </View>
            </View>
        </View>
    );
});

export default RouteRow;
