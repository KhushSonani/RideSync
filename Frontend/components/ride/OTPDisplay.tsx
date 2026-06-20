import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/store/ThemeContext";

interface OTPDisplayProps {
    otp: string;
    title?: string;
    subtitle?: string;
    length?: number;
}

export default function OTPDisplay({
    otp,
    title = "Your Trip OTP",
    subtitle = "Share this code with your driver to start the ride.",
    length = 6
}: OTPDisplayProps) {
    const { colorScheme, theme } = useTheme();
    const otpStr = otp || "";
    
    return (
        <View className="bg-primary/10 border border-primary/20 rounded-[20px] p-5 shadow-lg shadow-primary/10">
            <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-4 mt-0.5 shadow-sm shadow-primary/20">
                    <Ionicons name="keypad" size={20} color={theme.colors.primary} />
                </View>
                <View className="flex-1">
                    <Text className="text-primary font-black text-[15px] uppercase tracking-widest mb-1">
                        {title}
                    </Text>
                    <Text className="text-foreground/80 text-[12px] leading-4">
                        {subtitle}
                    </Text>
                    
                    <View className="flex-row justify-between mt-4 max-w-[260px]">
                        {Array.from({ length }).map((_, i) => (
                            <View
                                key={i}
                                className="w-10 h-12 rounded-[14px] bg-[#0A1017] border border-primary/40 items-center justify-center shadow-md"
                            >
                                <Text className="text-primary text-[22px] font-bold">
                                    {otpStr[i] || '·'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}
