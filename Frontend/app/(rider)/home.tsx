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
    ActivityIndicator,
    Platform,
} from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { api } from "@/services/api";
import { connectSocket } from "@/services/socket";
import { getAccessToken } from "@/services/storage";
import { useRiderLocation } from "@/services/useRiderLocation";
import { useLocation } from "@/store/LocationContext";
import EmptyStateCard from "@/components/common/EmptyStateCard";
import RideHistoryCard from "@/components/common/RideHistoryCard";
import { useTheme } from "@/store/ThemeContext";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fallback map region — shows India while GPS fix is loading */
const INDIA_REGION = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 20,
    longitudeDelta: 20,
};

const { height: SCREEN_H } = Dimensions.get("window");
/** Bottom card never exceeds 65% of the screen so the map is always visible */
const BOTTOM_CARD_MAX_H = Math.round(SCREEN_H * 0.65);

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
    const [checkingRide, setCheckingRide] = useState(true);
    const [recentRides, setRecentRides] = useState<any[]>([]);

    const mapRef = useRef<MapView>(null);
    const cameraAnimatedRef = useRef(false);

    // ── GPS location (for map centering — does not set LocationContext) ────────
    const { coords: currentLocation, permissionDenied } = useRiderLocation();
    const { setPickup, setDrop } = useLocation();
    const { colorScheme, theme } = useTheme();

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

    // ── App lifecycle (socket init + greeting) ────────────────────────────
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting("Good morning");
        else if (h < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        const initSocket = async () => {
            const token = await getAccessToken();
            if (!token) return;
            connectSocket(token);
            // Ride lifecycle events are NOT wired here — home.tsx has no active
            // ride and navigation recovery is handled by useFocusEffect below.
        };

        initSocket();
    }, []);


    useFocusEffect(
        React.useCallback(() => {
            loadProfileAndRide();
        }, [])
    );

    async function loadProfileAndRide() {
        setProfileLoading(true);
        setCheckingRide(true);
        try {
            // Check for active ride first
            const rideRes = await api.get("/rides/current");
            if (rideRes.data?.data) {
                const status = rideRes.data.data.status;
                if (status === "arriving" || status === "started") {
                    router.replace("/(rider)/live-tracking");
                    return;
                } else if (status === "accepted") {
                    router.replace({
                        pathname: "/(rider)/driver-assigned",
                        params: { otp: rideRes.data.data.otp || "" }
                    });
                    return;
                } else if (status === "requested") {
                    router.replace("/(rider)/searching-driver");
                    return;
                }
            }

            const res = await api.get("/users/profile");
            if (res.data?.data) setUser(res.data.data);

            const ridesRes = await api.get("/rides/history");
            if (ridesRes.data?.data?.rides) {
                // Filter only completed or cancelled rides to show in recent
                const history = ridesRes.data.data.rides.filter((r: any) => r.status === "completed" || r.status === "cancelled");
                setRecentRides(history.slice(0, 2));
            }
        } catch {
            setUser({
                fullname: "RideSync User",
                username: "rider",
                email: "",
                role: "rider",
                avatar: null,
            });
            setRecentRides([]);
        } finally {
            setProfileLoading(false);
            setCheckingRide(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadProfileAndRide();
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

    if (checkingRide) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }}>
                <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

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
                customMapStyle={colorScheme === 'light' ? [] : DARK_MAP_STYLE}
            />

            {/* ── LOCATE ME BUTTON ──────────────────────────────────────── */}
            <TouchableOpacity
                onPress={() => {
                    if (currentLocation) {
                        mapRef.current?.animateToRegion({
                            latitude: currentLocation.lat,
                            longitude: currentLocation.lng,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }, 1000);
                    }
                }}
                style={{
                    position: "absolute",
                    top: 130,
                    right: 20,
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 5,
                    zIndex: 20,
                }}
            >
                <Feather name="navigation" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

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
                        <Feather name="map-pin" size={14} color={theme.colors.danger} />
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
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: (theme.colors.border),
                            flex: 1,
                            marginRight: 12,
                        }}
                    >
                        <Text style={{ color: "#748096", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
                            {greeting}
                        </Text>
                        <Text
                            style={{ color: theme.colors.textPrimary, fontSize: 17, fontWeight: "700", marginTop: 2 }}
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
                                backgroundColor: theme.colors.background,
                                borderWidth: 1,
                                borderColor: (theme.colors.border),
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Feather name="layers" size={18} color={theme.colors.primary} />
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
                                    backgroundColor: theme.colors.background,
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
                                    <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: "700" }}>
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
                                    borderColor: theme.colors.background,
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* ── BOTTOM SHEET PANEL ─────────────────────────────────── */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: BOTTOM_CARD_MAX_H,
                    zIndex: 5,
                    backgroundColor: theme.colors.background,
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -4 },
                    elevation: 20,
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
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
                        />
                    }
                    contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 80 }}
                >
                    {/* Drag handle */}
                    <View style={{ alignItems: "center", paddingTop: 14, paddingBottom: 24 }}>
                        <View
                            style={{
                                width: 48,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: theme.colors.border,
                            }}
                        />
                    </View>

                    {/* "Where to?" header text (optional premium touch) */}
                    <Text style={{
                        color: theme.colors.textPrimary,
                        fontSize: 22,
                        fontWeight: "800",
                        paddingHorizontal: 20,
                        marginBottom: 16
                    }}>
                        Get a ride
                    </Text>

                    {/* "Where to?" input pill */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => router.push("/(rider)/create-ride")}
                        accessibilityLabel="Book a ride — where to?"
                        style={{
                            marginHorizontal: 20,
                            marginBottom: 24,
                            height: 60,
                            backgroundColor: theme.colors.surface,
                            borderRadius: 20,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            borderWidth: 1.5,
                            borderColor: theme.colors.primary,
                            shadowColor: theme.colors.primary,
                            shadowOpacity: 0.15,
                            shadowRadius: 16,
                            shadowOffset: { width: 0, height: 6 },
                            elevation: 8,
                        }}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                backgroundColor: theme.colors.primary + "1A",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 14,
                            }}
                        >
                            <Feather name="search" size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={{ color: theme.colors.textPrimary, fontSize: 17, fontWeight: "600", flex: 1 }}>
                            Where to?
                        </Text>
                        <View style={{
                            backgroundColor: theme.colors.primary,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 14,
                        }}>
                            <Feather name="arrow-right" size={18} color={theme.colors.background} />
                        </View>
                    </TouchableOpacity>

                    {/* Recent Ride */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700" }}>
                                Recent
                            </Text>
                        </View>

                        {recentRides.length === 0 ? (
                            <View
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "transparent",
                                    paddingVertical: 20,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderStyle: "dashed",
                                    borderColor: theme.colors.border,
                                }}
                            >
                                <Feather name="map" size={24} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 14, fontWeight: "500" }}>No recent rides found</Text>
                            </View>
                        ) : (
                            recentRides.map((ride, idx) => (
                                <TouchableOpacity
                                    key={ride._id || idx}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        if (ride.pickup?.location?.coordinates && ride.drop?.location?.coordinates) {
                                            setPickup({
                                                address: ride.pickup.address || "Recent Pickup",
                                                coords: { lat: ride.pickup.location.coordinates[1], lng: ride.pickup.location.coordinates[0] }
                                            });
                                            setDrop({
                                                address: ride.drop.address || "Recent Destination",
                                                coords: { lat: ride.drop.location.coordinates[1], lng: ride.drop.location.coordinates[0] }
                                            });
                                            router.push("/(rider)/create-ride");
                                        } else {
                                            router.push("/(rider)/create-ride");
                                        }
                                    }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        backgroundColor: theme.colors.surface,
                                        padding: 18,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        shadowColor: "#000",
                                        shadowOpacity: 0.05,
                                        shadowRadius: 12,
                                        shadowOffset: { width: 0, height: 4 },
                                        elevation: 3,
                                        marginBottom: idx === recentRides.length - 1 ? 0 : 12,
                                    }}
                                >
                                    <View style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: theme.colors.background,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: 16
                                    }}>
                                        <Feather name="clock" size={20} color={theme.colors.textSecondary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 3 }} numberOfLines={1}>
                                            {ride.drop?.address || "Destination"}
                                        </Text>
                                        <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                                            From {ride.pickup?.address || "Pickup"}
                                        </Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                            ))
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
