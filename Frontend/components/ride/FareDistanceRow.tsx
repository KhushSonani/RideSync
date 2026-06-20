import React, { memo } from "react";
import { View, Text } from "react-native";

interface FareDistanceRowProps {
    fare: number;
    distance: number | null;
    currency?: string;
}

/**
 * Displays fare and distance side-by-side with a subtle divider.
 * Used on ride request cards, active ride, and completion screens.
 */
const FareDistanceRow = memo(function FareDistanceRow({
    fare,
    distance,
    currency = "₹",
}: FareDistanceRowProps) {
    return (
        <View className="flex-row items-center">
            <View className="flex-1">
                <Text className="text-muted text-[10px] uppercase tracking-wider">
                    Fare
                </Text>
                <Text className="text-foreground text-[20px] font-bold mt-0.5">
                    {currency}
                    {fare.toFixed(0)}
                </Text>
            </View>

            {distance !== null && (
                <>
                    <View className="w-[1px] h-8 bg-foreground/[0.06] mx-4" />
                    <View className="flex-1">
                        <Text className="text-muted text-[10px] uppercase tracking-wider">
                            Distance
                        </Text>
                        <Text className="text-primary text-[20px] font-bold mt-0.5">
                            {distance.toFixed(1)} km
                        </Text>
                    </View>
                </>
            )}
        </View>
    );
});

export default FareDistanceRow;
