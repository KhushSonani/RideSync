import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "@/constants/theme";
import OnboardingSlide from "@/components/common/OnboardingSlide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const ONBOARDING_KEY = "ridesync_onboarded_v1";

const SLIDES = [
    {
        icon: "navigation" as const,
        iconColor: COLORS.primary,
        title: "Welcome to\nRideSync",
        subtitle:
            "Premium ride-hailing built for speed, safety, and comfort. Your journey, perfectly synced.",
        tag: "1 of 3",
    },
    {
        icon: "zap" as const,
        iconColor: "#0A84FF",
        title: "Book in\nSeconds",
        subtitle:
            "Enter your pickup and destination. We'll match you with the nearest verified driver instantly.",
        tag: "2 of 3",
    },
    {
        icon: "shield" as const,
        iconColor: "#10B981",
        title: "Travel with\nConfidence",
        subtitle:
            "Every driver is background-checked and document-verified. Share your trip live with trusted contacts.",
        tag: "3 of 3",
    },
];

export default function OnboardingScreen() {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const isLast = activeIndex === SLIDES.length - 1;

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(idx);
    };

    const handleNext = () => {
        if (isLast) {
            finishOnboarding();
        } else {
            scrollRef.current?.scrollTo({
                x: SCREEN_WIDTH * (activeIndex + 1),
                animated: true,
            });
        }
    };

    const finishOnboarding = async () => {
        try {
            await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
        } catch {
            /* non-critical */
        }
        router.replace("/");
    };

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Glow background */}
            <View className="absolute inset-0 overflow-hidden">
                <View
                    className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />
                <View
                    className="absolute bottom-[-80px] -left-20 w-[260px] h-[260px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
                />
                <View
                    className="absolute top-[-20px] right-[-40px] w-[260px] h-[260px] rounded-full items-center justify-center"
                    style={{ backgroundColor: COLORS.glowRing }}
                >
                    <View className="w-[190px] h-[190px] rounded-full bg-[#1D6B61]/15" />
                </View>
            </View>

            <SafeAreaView className="flex-1">
                {/* Skip button */}
                <View className="flex-row justify-end px-6 pt-2">
                    {!isLast && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={finishOnboarding}
                            accessibilityRole="button"
                            accessibilityLabel="Skip onboarding"
                        >
                            <Text className="text-[#748096] text-[14px] font-semibold">
                                Skip
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Slides */}
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    scrollEventThrottle={16}
                    style={{ flex: 1 }}
                >
                    {SLIDES.map((slide) => (
                        <View key={slide.tag} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                            <OnboardingSlide
                                icon={slide.icon}
                                iconColor={slide.iconColor}
                                title={slide.title}
                                subtitle={slide.subtitle}
                                tag={slide.tag}
                            />
                        </View>
                    ))}
                </ScrollView>

                {/* Bottom controls */}
                <View className="px-6 pb-8">
                    {/* Dot indicator */}
                    <View className="flex-row items-center justify-center mb-8 gap-x-2">
                        {SLIDES.map((_, i) => (
                            <View
                                key={i}
                                className="rounded-full"
                                style={{
                                    width: i === activeIndex ? 24 : 8,
                                    height: 8,
                                    backgroundColor:
                                        i === activeIndex ? COLORS.primary : "rgba(255,255,255,0.15)",
                                }}
                            />
                        ))}
                    </View>

                    {/* Next / Get Started button */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleNext}
                        accessibilityRole="button"
                        accessibilityLabel={isLast ? "Get Started" : "Next"}
                        className="h-14 bg-[#11E0C5] rounded-2xl items-center justify-center"
                        style={{
                            shadowColor: "#11E0C5",
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 8,
                        }}
                    >
                        <Text className="text-[#071018] text-[16px] font-bold">
                            {isLast ? "Get Started" : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
