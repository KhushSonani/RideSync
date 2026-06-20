import React, { memo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/store/ThemeContext";

export type RideStatus =
    | "requested"
    | "accepted"
    | "arriving"
    | "started"
    | "completed"
    | "cancelled";

interface StatusConfig {
    label: string;
    subtitle?: string;
    color: string;
    bg: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const STATUS_CONFIG: Record<RideStatus, StatusConfig> = {
    requested: {
        label: "Searching for driver",
        color: "#F5A623",
        bg: "rgba(245,166,35,0.10)",
        border: "rgba(245,166,35,0.25)",
        icon: "time-outline",
    },
    accepted: {
        label: "Driver assigned",
        color: "#11E0C5", // fallback, overridden in component
        bg: "rgba(17,224,197,0.10)",
        border: "rgba(17,224,197,0.25)",
        icon: "checkmark-circle-outline",
    },
    arriving: {
        label: "Driver arriving",
        color: "#0A84FF",
        bg: "rgba(10,132,255,0.10)",
        border: "rgba(10,132,255,0.25)",
        icon: "navigate-outline",
    },
    started: {
        label: "Ride in progress",
        color: "#10B981",
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.25)",
        icon: "car-sport-outline",
    },
    completed: {
        label: "Ride completed",
        color: "#10B981",
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.25)",
        icon: "checkmark-done-outline",
    },
    cancelled: {
        label: "Ride cancelled",
        color: "#EF4444",
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.25)",
        icon: "close-circle-outline",
    },
};

interface RideStatusCardProps {
    status: RideStatus;
    /** Optional secondary line below the label */
    subtitle?: string;
}

/**
 * A coloured status pill card for displaying the current ride state.
 * Used on searching, driver-assigned, live-tracking, and completion screens.
 */
const RideStatusCard = memo(function RideStatusCard({
    status,
    subtitle,
}: RideStatusCardProps) {
    const { colorScheme, theme } = useTheme();
    const cfg = { ...STATUS_CONFIG[status] };
    if (status === 'accepted') {
        cfg.color = theme.colors.primary;
    }

    return (
        <View
            className="flex-row items-center px-4 py-3 rounded-2xl border"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
            accessible
            accessibilityLabel={`Ride status: ${cfg.label}`}
        >
            <Ionicons name={cfg.icon} size={18} color={cfg.color} />
            <View className="ml-3 flex-1">
                <Text className="font-bold text-[13px]" style={{ color: cfg.color }}>
                    {cfg.label}
                </Text>
                {subtitle ? (
                    <Text className="text-foreground/60 text-[11px] mt-0.5">{subtitle}</Text>
                ) : null}
            </View>
        </View>
    );
});

export default RideStatusCard;
