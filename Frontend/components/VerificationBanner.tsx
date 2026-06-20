import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

interface VerificationBannerProps {
    driverVerified: "pending" | "under_review" | "verified" | "rejected";
    verificationNote?: string | null;
    onActionPress?: () => void;
}

export default function VerificationBanner({
    driverVerified,
    verificationNote,
    onActionPress
}: VerificationBannerProps) {
    if (driverVerified === "verified") return null;

    let bgColor = "bg-amber-500/10";
    let borderColor = "border-amber-500/30";
    let textColor = "text-amber-400";
    let icon: keyof typeof Feather.glyphMap = "alert-triangle";
    let title = "Account Under Review";
    let description = "Your driver profile is pending verification. Access to ride sharing features is locked until approved.";
    let actionText = "View Documents";

    if (driverVerified === "under_review") {
        bgColor = "bg-blue-500/10";
        borderColor = "border-blue-500/30";
        textColor = "text-blue-400";
        icon = "clock";
        title = "Verification Under Review";
        description = "An administrator is currently reviewing your documents. We will notify you once approved.";
    } else if (driverVerified === "rejected") {
        bgColor = "bg-red-500/10";
        borderColor = "border-red-500/30";
        textColor = "text-red-400";
        icon = "x-circle";
        title = "Verification Rejected";
        description = verificationNote 
            ? `Your verification request was rejected: "${verificationNote}". Please check and re-upload.`
            : "Your verification request was rejected. Please review and re-upload your documents.";
        actionText = "Update Documents";
    }

    const handlePress = () => {
        if (onActionPress) {
            onActionPress();
        } else {
            router.push("/(driver)/documents");
        }
    };

    return (
        <View className={`${bgColor} border ${borderColor} p-4 rounded-2xl mb-6 flex-row items-start`}>
            <View className="mr-3 mt-0.5">
                <Feather name={icon} size={20} color={driverVerified === "rejected" ? "#EF4444" : driverVerified === "under_review" ? "#3B82F6" : "#F5A623"} />
            </View>
            <View className="flex-1">
                <Text className={`font-bold text-sm ${textColor}`}>
                    {title}
                </Text>
                <Text className="text-foreground/80 text-xs mt-1 leading-4">
                    {description}
                </Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handlePress}
                    className="mt-3 bg-foreground/5 border border-border px-3 py-1.5 rounded-lg align-self-start self-start"
                >
                    <Text className="text-foreground text-xs font-semibold">
                        {actionText}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
