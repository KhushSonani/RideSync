import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { glassCard } from "@/constants/styles";
import { useTheme } from "@/store/ThemeContext";

interface EmptyStateCardProps {
    /** Feather icon name */
    icon: React.ComponentProps<typeof Feather>["name"];
    iconColor?: string;
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
    /** Extra className on the outer glassCard wrapper */
    className?: string;
    minHeight?: number;
}

const EmptyStateCard = memo(function EmptyStateCard({
    icon,
    iconColor = "#748096",
    title,
    subtitle,
    ctaLabel,
    onCtaPress,
    className = "",
    minHeight = 160,
}: EmptyStateCardProps) {
    const { theme } = useTheme();
    const resolvedIconColor = iconColor === "#748096" ? theme.colors.textMuted : iconColor;

    return (
        <View
            className={`${glassCard} p-6 items-center justify-center ${className}`}
            style={{ minHeight }}
            accessibilityRole="none"
        >
            {/* Icon halo */}
            <View
                className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: `${resolvedIconColor}14` }}
            >
                <Feather name={icon} size={26} color={resolvedIconColor} />
            </View>

            {/* Title */}
            <Text className="text-foreground text-[15px] font-bold text-center">
                {title}
            </Text>

            {/* Subtitle */}
            {subtitle ? (
                <Text className="text-muted text-[13px] text-center mt-1.5 leading-5 max-w-[240px]">
                    {subtitle}
                </Text>
            ) : null}

            {/* Optional CTA */}
            {ctaLabel && onCtaPress ? (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onCtaPress}
                    accessibilityRole="button"
                    accessibilityLabel={ctaLabel}
                    className="mt-5 h-11 px-6 bg-primary rounded-xl items-center justify-center"
                >
                    <Text className="text-background text-[13px] font-bold">
                        {ctaLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
});

export default EmptyStateCard;
