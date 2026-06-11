/**
 * @file home.tsx
 * @description Rider home screen — Uber/Ola-style with full-screen map.
 *
 * Layout:
 *   MapView (absolute, full screen)
 *     └ showsUserLocation — blue dot at current GPS position
 *   Floating header (top, SafeAreaView)
 *     └ Greeting + name / sandbox shortcut / avatar
 *   Floating bottom card
 *     └ "Where to?" search pill
 *     └ Quick-access shortcuts (Home, Work, Trips)
 *     └ Recent trips (empty state or RideHistoryCard list)
 *
 * Existing logic preserved exactly:
 *   - Socket init / cleanup
 *   - Profile fetch
 *   - Pull-to-refresh
 *   - Greeting by time of day
 */

import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    Image,
    RefreshControl,
    ScrollView,
    Dimensions,
} from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { api } from "@/services/api";
import { connectSocket, getSocket } from "@/services/socket";
import { getAccessToken } from "@/services/storage";
import { useRiderLocation } from "@/services/useRiderLocation";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fallback map region — shows India while GPS fix is loading */
const INDIA_REGION = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 20,
    longitudeDelta: 20,
};

const { height: SCREEN_H } = Dimensions.get("window");
/** Bottom card never exceeds 58% of the screen so the map is always visible */
const BOTTOM_CARD_MAX_H = Math.round(SCREEN_H * 0.58);

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
    fullname: string;
    username: string;
    email: string;
    role: string;
    avatar?: { url?: string } | null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RiderHomeScreen() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState("Welcome back");

    // TODO: replace with real rides from GET /rides/history
    const recentRides: any[] = [];

    const mapRef = useRef<MapView>(null);
    const cameraAnimatedRef = useRef(false);

    // ── GPS location (for map centering — does not set LocationContext) ────────
    const { coords: currentLocation, permissionDenied } = useRiderLocation();

    // ── Animate camera to current location on first GPS fix ───────────────────
    useEffect(() => {
        if (currentLocation && !cameraAnimatedRef.current) {
            cameraAnimatedRef.current = true;
            mapRef.current?.animateToRegion(
                {
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                },
                900
            );
        }
    }, [currentLocation]);

    // ── App lifecycle (socket + profile — unchanged from original) ────────────
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting("Good morning");
        else if (h < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        let socket: ReturnType<typeof getSocket> | null = null;

        const initSocket = async () => {
            const token = await getAccessToken();
            if (!token) return;
            socket = connectSocket(token);

            // TODO: wire up ride lifecycle events
            socket.on("new_ride_request", (ride: any) => { console.log("[Socket] new_ride_request:", ride?._id); });
            socket.on("ride_accepted", (ride: any) => { console.log("[Socket] ride_accepted:", ride?._id); });
            socket.on("ride_status_updated", (ride: any) => { console.log("[Socket] ride_status_updated:", ride?.status); });
            socket.on("ride_completed", (ride: any) => { console.log("[Socket] ride_completed:", ride?._id); });
            socket.on("ride_cancelled", (ride: any) => { console.log("[Socket] ride_cancelled:", ride?._id); });
        };

        initSocket();
        loadProfile();

        return () => {
            if (socket) {
                socket.off("new_ride_request");
                socket.off("ride_accepted");
                socket.off("ride_status_updated");
                socket.off("ride_completed");
                socket.off("ride_cancelled");
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadProfile = async () => {
        setProfileLoading(true);
        try {
            const res = await api.get("/users/profile");
            if (res.data?.data) setUser(res.data.data);
        } catch {
            setUser({
                fullname: "RideSync User",
                username: "rider",
                email: "",
                role: "rider",
                avatar: null,
            });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadProfile();
        setRefreshing(false);
    };

    const getInitials = (name: string) => {
        if (!name) return "RS";
        const parts = name.split(" ");
        return parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={{ flex: 1, backgroundColor: "#070B12" }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── FULL SCREEN MAP ───────────────────────────────────────── */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                initialRegion={INDIA_REGION}
                showsUserLocation={!permissionDenied}
                showsMyLocationButton={false}
                showsCompass={false}
                showsScale={false}
                toolbarEnabled={false}
                customMapStyle={DARK_MAP_STYLE}
            />

            {/* ── PERMISSION DENIED BANNER ──────────────────────────────── */}
            {permissionDenied && (
                <SafeAreaView
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 20,
                    }}
                >
                    <View
                        style={{
                            marginHorizontal: 16,
                            marginTop: 8,
                            backgroundColor: "rgba(239,68,68,0.15)",
                            borderWidth: 1,
                            borderColor: "rgba(239,68,68,0.3)",
                            borderRadius: 14,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <Feather name="map-pin" size={14} color="#EF4444" />
                        <Text
                            style={{
                                color: "#EF4444",
                                fontSize: 12,
                                fontWeight: "600",
                                marginLeft: 8,
                                flex: 1,
                            }}
                        >
                            Location access denied — enable it in Settings for a better experience.
                        </Text>
                    </View>
                </SafeAreaView>
            )}

            {/* ── FLOATING HEADER ───────────────────────────────────────── */}
            <SafeAreaView
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    pointerEvents: "box-none",
                } as any}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: 10,
                        pointerEvents: "box-none",
                    } as any}
                >
                    {/* Greeting */}
                    <View
                        style={{
                            backgroundColor: "rgba(7,11,18,0.82)",
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.07)",
                            flex: 1,
                            marginRight: 12,
                        }}
                    >
                        <Text style={{ color: "#748096", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
                            {greeting}
                        </Text>
                        <Text
                            style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginTop: 2 }}
                            numberOfLines={1}
                        >
                            {profileLoading ? "…" : (user?.fullname || "RideSync User")}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => router.push("/sandbox")}
                            accessibilityLabel="Open component sandbox"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: "rgba(7,11,18,0.85)",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.1)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Feather name="layers" size={18} color="#11E0C5" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(rider)/profile")}
                            accessibilityLabel="Go to profile"
                            style={{ position: "relative" }}
                        >
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: "rgba(7,11,18,0.85)",
                                    borderWidth: 1.5,
                                    borderColor: "rgba(17,224,197,0.4)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                }}
                            >
                                {user?.avatar?.url ? (
                                    <Image
                                        source={{ uri: user.avatar.url }}
                                        style={{ width: 44, height: 44, borderRadius: 22 }}
                                    />
                                ) : (
                                    <Text style={{ color: "#11E0C5", fontSize: 14, fontWeight: "700" }}>
                                        {getInitials(user?.fullname ?? "")}
                                    </Text>
                                )}
                            </View>
                            {/* Online dot */}
                            <View
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    right: 0,
                                    width: 13,
                                    height: 13,
                                    borderRadius: 7,
                                    backgroundColor: "#10B981",
                                    borderWidth: 2,
                                    borderColor: "#070B12",
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* ── BOTTOM FLOATING CARD ─────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: BOTTOM_CARD_MAX_H,
                    zIndex: 10,
                    backgroundColor: "rgba(7,11,18,0.97)",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    shadowColor: "#000",
                    shadowOpacity: 0.5,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: -4 },
                    elevation: 24,
                }}
            >
                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#11E0C5"
                            colors={["#11E0C5"]}
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 28 }}
                >
                    {/* Drag handle */}
                    <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 20 }}>
                        <View
                            style={{
                                width: 40,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: "rgba(255,255,255,0.15)",
                            }}
                        />
                    </View>

                    {/* "Where to?" pill */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => router.push("/(rider)/create-ride")}
                        accessibilityLabel="Book a ride — where to?"
                        style={{
                            marginHorizontal: 20,
                            marginBottom: 16,
                            height: 58,
                            backgroundColor: "#11E0C5",
                            borderRadius: 20,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 18,
                            shadowColor: "#11E0C5",
                            shadowOpacity: 0.45,
                            shadowRadius: 18,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                backgroundColor: "rgba(7,16,24,0.22)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 12,
                            }}
                        >
                            <Feather name="search" size={16} color="#071018" />
                        </View>
                        <Text style={{ color: "#071018", fontSize: 16, fontWeight: "700", flex: 1 }}>
                            Where to?
                        </Text>
                        <Feather name="arrow-right" size={18} color="#071018" />
                    </TouchableOpacity>

                    {/* Quick-access shortcuts */}
                    <View
                        style={{
                            flexDirection: "row",
                            marginHorizontal: 20,
                            marginBottom: 20,
                            gap: 10,
                        }}
                    >
                        {[
                            { icon: "home" as const, label: "Home", route: "/(rider)/create-ride" as const },
                            { icon: "briefcase" as const, label: "Work", route: "/(rider)/create-ride" as const },
                            { icon: "clock" as const, label: "Trips", route: "/(rider)/rides" as const },
                        ].map(({ icon, label, route }) => (
                            <TouchableOpacity
                                key={label}
                                activeOpacity={0.8}
                                onPress={() => router.push(route as any)}
                                style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "#0D1420",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.07)",
                                    borderRadius: 16,
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    gap: 6,
                                }}
                            >
                                <Feather name={icon} size={15} color="#748096" />
                                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Divider */}
                    <View
                        style={{
                            height: 1,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            marginHorizontal: 20,
                            marginBottom: 18,
                        }}
                    />

                    {/* Recent Trips header */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 20,
                            marginBottom: 14,
                        }}
                    >
                        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                            Recent Trips
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push("/(rider)/rides")}
                            accessibilityLabel="See all rides"
                        >
                            <Text style={{ color: "#11E0C5", fontSize: 13, fontWeight: "600" }}>
                                See All
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Recent trips list or empty state */}
                    <View style={{ paddingHorizontal: 20 }}>
                        {recentRides.length === 0 ? (
                            <EmptyStateCard
                                icon="map"
                                iconColor="#11E0C5"
                                title="No trips yet"
                                subtitle="Your completed rides will appear here after your first trip."
                                ctaLabel="Book Your First Ride"
                                onCtaPress={() => router.push("/(rider)/create-ride")}
                            />
                        ) : (
                            <View style={{ gap: 12 }}>
                                {recentRides.slice(0, 3).map((ride, i) => (
                                    <RideHistoryCard
                                        key={ride._id ?? i}
                                        pickup={ride.pickup?.address ?? "Pickup"}
                                        drop={ride.drop?.address ?? "Destination"}
                                        date={ride.createdAt ?? ""}
                                        fare={`₹${ride.fare ?? 0}`}
                                        status={ride.status}
                                        personName={ride.driver?.user?.fullname}
                                        distance={ride.distance ? `${ride.distance} km` : undefined}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// ─── Dark map style ───────────────────────────────────────────────────────────

const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#0d1420" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0d1420" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#748096" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#a0a8b4" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#748096" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#0f1d2b" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3a4d60" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1a2840" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#111d2c" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#5a6a7e" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#243348" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1a2840" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#8a9aaa" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#14253a" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#748096" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#07111e" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3a4d60" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#07111e" }],
    },
];
