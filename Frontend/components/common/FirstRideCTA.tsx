import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { glassCard } from "@/constants/styles";
import { useTheme } from "@/store/ThemeContext";

interface FirstRideCTAProps {
    onPress: () => void;
}

const FirstRideCTA = memo(function FirstRideCTA({ onPress }: FirstRideCTAProps) {
    const { theme } = useTheme();

    const BENEFITS: {
        icon: React.ComponentProps<typeof Feather>["name"];
        color: string;
        title: string;
        subtitle: string;
    }[] = [
        {
            icon: "shield",
            color: theme.colors.primary,
            title: "Verified Drivers Only",
            subtitle: "Every driver is background-checked and document-verified",
        },
        {
            icon: "zap",
            color: "#0A84FF",
            title: "Instant Matching",
            subtitle: "Matched with the nearest available driver in seconds",
        },
        {
            icon: "dollar-sign",
            color: theme.colors.success,
            title: "Transparent Pricing",
            subtitle: "Fare shown upfront — no surge, no surprises",
        },
    ];

    return (
        <View className="mb-6">
            {/* Primary hero CTA */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Book a ride"
                className="h-[60px] bg-primary rounded-[20px] flex-row items-center px-5 mb-4 shadow-lg"
                style={{
                    shadowColor: theme.colors.primary,
                    shadowOpacity: 0.35,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 10,
                }}
            >
                <View className="w-9 h-9 rounded-xl bg-background/20 items-center justify-center mr-3">
                    <Feather name="search" size={17} color={theme.colors.background} />
                </View>
                <Text className="text-background text-[16px] font-bold flex-1">
                    Where to?
                </Text>
                <Feather name="arrow-right" size={18} color={theme.colors.background} />
            </TouchableOpacity>

            {/* Benefits grid */}
            <View className={`${glassCard} p-5`}>
                <Text className="text-foreground text-[13px] font-bold mb-4 tracking-wide uppercase">
                    Why RideSync?
                </Text>
                <View className="gap-y-3">
                    {BENEFITS.map((b) => (
                        <View key={b.title} className="flex-row items-center">
                            <View
                                className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: `${b.color}14` }}
                            >
                                <Feather name={b.icon} size={16} color={b.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-foreground text-[13px] font-semibold">
                                    {b.title}
                                </Text>
                                <Text className="text-muted text-[11px] mt-0.5">
                                    {b.subtitle}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
});
export default FirstRideCTA;
