import React, { memo } from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

interface OnboardingSlideProps {
    icon: React.ComponentProps<typeof Feather>["name"];
    iconColor?: string;
    title: string;
    subtitle: string;
    /** Small tag shown above the icon, e.g. "Step 1 of 3" */
    tag?: string;
}

const OnboardingSlide = memo(function OnboardingSlide({
    icon,
    iconColor = COLORS.primary,
    title,
    subtitle,
    tag,
}: OnboardingSlideProps) {
    return (
        <View className="flex-1 items-center justify-center px-8">
            {/* Tag */}
            {tag ? (
                <View className="bg-primary/10 border border-primary/20 px-4 py-1 rounded-full mb-8">
                    <Text className="text-primary text-[11px] font-bold uppercase tracking-widest">
                        {tag}
                    </Text>
                </View>
            ) : null}

            {/* Icon halo — triple ring */}
            <View
                className="w-36 h-36 rounded-full items-center justify-center mb-10"
                style={{ backgroundColor: `${iconColor}08` }}
            >
                <View
                    className="w-24 h-24 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${iconColor}14` }}
                >
                    <View
                        className="w-16 h-16 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${iconColor}22` }}
                    >
                        <Feather name={icon} size={34} color={iconColor} />
                    </View>
                </View>
            </View>

            {/* Title */}
            <Text className="text-foreground text-[28px] font-bold text-center tracking-tight leading-9">
                {title}
            </Text>

            {/* Subtitle */}
            <Text className="text-muted text-[15px] text-center mt-4 leading-[26px] max-w-[300px]">
                {subtitle}
            </Text>
        </View>
    );
});

export default OnboardingSlide;
