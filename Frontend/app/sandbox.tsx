import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

// Common components
import FirstRideCTA from "@/components/common/FirstRideCTA";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";
import OnboardingSlide from "@/components/common/OnboardingSlide";

// Ride components
import DriverInfoCard from "@/components/ride/DriverInfoCard";
import FareDistanceRow from "@/components/ride/FareDistanceRow";
import LocationSearchInput from "@/components/ride/LocationSearchInput";
import OTPInput from "@/components/ride/OTPInput";
import RideStatusCard from "@/components/ride/RideStatusCard";
import RouteRow from "@/components/ride/RouteRow";

import { COLORS } from "@/constants/theme";
import type { DriverInfo } from "@/services/socket.types";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockDriver: DriverInfo = {
    _id: "d_001",
    user: {
        _id: "u_001",
        fullname: "Alex Johnson",
        username: "alex_johnson",
        avatar: { url: null, public_id: null },
    },
    vehicle: {
        _id: "v_001",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        color: "Silver",
        plate: "MH12AB1234",
        vehicleVerified: "verified",
    },
    status: "available",
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SandboxScreen() {
    const [otpValue, setOtpValue] = useState("");

    const Section = ({
        title,
        children,
    }: {
        title: string;
        children: React.ReactNode;
    }) => (
        <View className="mb-8 border-b border-white/[0.07] pb-6">
            <View className="flex-row items-center px-5 mb-4">
                <View className="w-1 h-4 rounded-full bg-[#11E0C5] mr-3" />
                <Text className="text-[#11E0C5] text-[12px] font-bold uppercase tracking-widest">
                    {title}
                </Text>
            </View>
            <View className="px-5">{children}</View>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Ambient glow */}
            <View className="absolute inset-0 overflow-hidden pointer-events-none">
                <View className="absolute -top-24 -right-16 w-[300px] h-[300px] rounded-full bg-[#11E0C5]/6" />
                <View className="absolute bottom-0 -left-20 w-[200px] h-[200px] rounded-full bg-[#0A84FF]/6" />
            </View>

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center px-5 py-3 border-b border-white/[0.08] mb-1">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center -ml-2 mr-1"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-[17px] font-bold">UI Sandbox</Text>
                        <Text className="text-[#748096] text-[11px] mt-0.5">All 10 components</Text>
                    </View>
                    <View className="w-8 h-8 rounded-xl bg-[#11E0C5]/10 items-center justify-center">
                        <Feather name="layers" size={16} color="#11E0C5" />
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingTop: 20, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── 1. FirstRideCTA ─────────────────────────────── */}
                    <Section title="1 · FirstRideCTA">
                        <FirstRideCTA onPress={() => console.log("FirstRideCTA pressed")} />
                    </Section>

                    {/* ── 2. EmptyStateCard ───────────────────────────── */}
                    <Section title="2 · EmptyStateCard">
                        <EmptyStateCard
                            icon="map"
                            title="No Rides Yet"
                            subtitle="You haven't booked any rides. Your journey starts here."
                            ctaLabel="Book a Ride"
                            onCtaPress={() => console.log("EmptyStateCard CTA pressed")}
                        />
                    </Section>

                    {/* ── 3. RideHistoryCard ──────────────────────────── */}
                    <Section title="3 · RideHistoryCard">
                        <View className="gap-y-3">
                            <RideHistoryCard
                                pickup="Chhatrapati Shivaji Maharaj Airport, Mumbai"
                                drop="Bandra Kurla Complex, Mumbai"
                                date="Jun 8, 2026 • 10:30 AM"
                                fare="₹342"
                                status="completed"
                                personName="Alex Johnson"
                                distance="14.2 km"
                                onPress={() => console.log("RideHistoryCard pressed")}
                            />
                            <RideHistoryCard
                                pickup="Andheri Station, Mumbai"
                                drop="Nariman Point, Mumbai"
                                date="Jun 7, 2026 • 6:00 PM"
                                fare="₹210"
                                status="cancelled"
                                distance="11.5 km"
                            />
                        </View>
                    </Section>

                    {/* ── 4. OnboardingSlide ──────────────────────────── */}
                    <Section title="4 · OnboardingSlide">
                        <View className="h-[360px] rounded-2xl overflow-hidden border border-white/[0.05] bg-black/20">
                            <OnboardingSlide
                                icon="navigation"
                                iconColor={COLORS.primary}
                                title={"Welcome to\nRideSync"}
                                subtitle="Premium ride-hailing built for speed, safety, and comfort. Your journey, perfectly synced."
                                tag="1 of 3"
                            />
                        </View>
                    </Section>

                    {/* ── 5. DriverInfoCard ───────────────────────────── */}
                    <Section title="5 · DriverInfoCard">
                        <View
                            className="p-4 rounded-2xl border border-white/[0.07]"
                            style={{ backgroundColor: "rgba(13,20,32,0.9)" }}
                        >
                            <DriverInfoCard
                                driver={mockDriver}
                                onCallPress={() => console.log("Call driver")}
                                onMessagePress={() => console.log("Message driver")}
                            />
                        </View>
                    </Section>

                    {/* ── 6. FareDistanceRow ──────────────────────────── */}
                    <Section title="6 · FareDistanceRow">
                        <View
                            className="p-4 rounded-2xl border border-white/[0.07]"
                            style={{ backgroundColor: "rgba(13,20,32,0.9)" }}
                        >
                            <FareDistanceRow fare={342} distance={14.2} />
                        </View>
                    </Section>

                    {/* ── 7. LocationSearchInput ──────────────────────── */}
                    <Section title="7 · LocationSearchInput">
                        <View className="gap-y-3">
                            <LocationSearchInput
                                label="Pickup"
                                placeholder="Search pickup location…"
                                value=""
                                onPress={() => console.log("Pickup tapped")}
                                dotColor="#11E0C5"
                            />
                            <LocationSearchInput
                                label="Destination"
                                placeholder="Search destination…"
                                value="Bandra Kurla Complex, Mumbai"
                                onPress={() => console.log("Drop tapped")}
                                dotColor="#EF4444"
                            />
                            <LocationSearchInput
                                label="Loading state"
                                placeholder="Detecting location…"
                                value=""
                                loading
                            />
                        </View>
                    </Section>

                    {/* ── 8. OTPInput ─────────────────────────────────── */}
                    <Section title="8 · OTPInput">
                        <Text className="text-[#748096] text-[12px] mb-3">
                            Type digits to interact:
                        </Text>
                        <OTPInput
                            length={6}
                            value={otpValue}
                            onChange={setOtpValue}
                        />
                        {otpValue.length === 6 && (
                            <Text className="text-[#11E0C5] text-[12px] text-center mt-3 font-semibold">
                                OTP entered: {otpValue}
                            </Text>
                        )}
                    </Section>

                    {/* ── 9. RideStatusCard ───────────────────────────── */}
                    <Section title="9 · RideStatusCard">
                        <View className="gap-y-3">
                            <RideStatusCard status="requested" subtitle="Finding the nearest driver…" />
                            <RideStatusCard status="accepted" subtitle="Driver assigned, en route" />
                            <RideStatusCard status="arriving" subtitle="Driver is 2 mins away" />
                            <RideStatusCard status="started" subtitle="Heading to your destination" />
                            <RideStatusCard status="completed" subtitle="Arrived at destination" />
                            <RideStatusCard status="cancelled" subtitle="Ride was cancelled" />
                        </View>
                    </Section>

                    {/* ── 10. RouteRow ────────────────────────────────── */}
                    <Section title="10 · RouteRow">
                        <View
                            className="p-4 rounded-2xl border border-white/[0.07]"
                            style={{ backgroundColor: "rgba(13,20,32,0.9)" }}
                        >
                            <RouteRow
                                pickup={{ address: "Chhatrapati Shivaji Maharaj International Airport, Mumbai" }}
                                drop={{ address: "Bandra Kurla Complex, G Block, Mumbai" }}
                            />
                        </View>
                    </Section>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
