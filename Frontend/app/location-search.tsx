import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StatusBar,
    Keyboard,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { useLocation, type LocationEntry } from "@/store/LocationContext";
import { COLORS } from "@/constants/theme";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Prediction {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text: string;
        secondary_text: string;
    };
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const DEBOUNCE_MS = 300;

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchPredictions(
    query: string,
    signal: AbortSignal
): Promise<Prediction[]> {
    if (!query.trim() || query.trim().length < 2) return [];

    const url = new URL(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    url.searchParams.set("input", query);
    url.searchParams.set("key", GMAPS_KEY);
    url.searchParams.set("components", "country:in");
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);
    const data = await res.json();

    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Places API: ${data.status} – ${data.error_message ?? ""}`);
    }

    return (data.predictions ?? []) as Prediction[];
}

// Google Places API
async function geocodePlaceId(placeId: string): Promise<{ lat: number; lng: number }> {
    const url = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json"
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "geometry");
    url.searchParams.set("key", GMAPS_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
    const data = await res.json();

    const loc = data.result?.geometry?.location;
    if (!loc) throw new Error("No geometry returned");
    return { lat: loc.lat, lng: loc.lng };
}

// Google GeoCoding API
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = new URL(
        "https://maps.googleapis.com/maps/api/geocode/json"
    );
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", GMAPS_KEY);
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Reverse geocoding error: ${res.status}`);
    const data = await res.json();

    return (
        data.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function LocationSearchScreen() {
    const { type } = useLocalSearchParams<{ type: "pickup" | "drop" }>();
    const locationType = type === "drop" ? "drop" : "pickup";

    const { pickup, drop, setPickup, setDrop } = useLocation();

    // Initialise input with existing value so the user can see what was set
    const existingValue =
        locationType === "pickup" ? pickup.address : drop.address;

    const [query, setQuery] = useState(existingValue);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<TextInput>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-focus on mount
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 150);
        return () => clearTimeout(t);
    }, []);

    // Debounced autocomplete
    const search = useCallback((text: string) => {
        setQuery(text);
        setError(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();

        if (!text.trim() || text.trim().length < 2) {
            setPredictions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            const controller = new AbortController();
            abortRef.current = controller;
            try {
                const results = await fetchPredictions(text, controller.signal);
                setPredictions(results);
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("Places API Fetch Error:", err);
                    setError("Could not fetch suggestions. Check your connection.");
                    setPredictions([]);
                }
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
    }, []);

    // On suggestion tap
    const handleSelectPrediction = useCallback(
        async (prediction: Prediction) => {
            Keyboard.dismiss();
            setLoading(true);
            setError(null);
            try {
                const coords = await geocodePlaceId(prediction.place_id);
                const entry: LocationEntry = {
                    address: prediction.description,
                    coords,
                };
                if (locationType === "pickup") setPickup(entry);
                else setDrop(entry);
                router.back();
            } catch {
                setError("Could not resolve location. Please try again.");
            } finally {
                setLoading(false);
            }
        },
        [locationType, setPickup, setDrop]
    );

    // Use current GPS location as pickup/drop
    const handleUseCurrentLocation = useCallback(async () => {
        Keyboard.dismiss();
        setGeoLoading(true);
        setError(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setError("Location permission denied.");
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude: lat, longitude: lng } = loc.coords;
            const address = await reverseGeocode(lat, lng);
            const entry: LocationEntry = { address, coords: { lat, lng } };
            if (locationType === "pickup") setPickup(entry);
            else setDrop(entry);
            router.back();
        } catch {
            setError("Could not detect your location. Please try again.");
        } finally {
            setGeoLoading(false);
        }
    }, [locationType, setPickup, setDrop]);

    const handleClear = useCallback(() => {
        setQuery("");
        setPredictions([]);
        setError(null);
        inputRef.current?.focus();
    }, []);

    const isPickup = locationType === "pickup";
    const dotColor = isPickup ? "#11E0C5" : "#EF4444";
    const label = isPickup ? "Pickup location" : "Destination";

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Glow */}
            <View className="absolute inset-0 overflow-hidden pointer-events-none">
                <View
                    className="absolute -top-24 -right-16 w-[320px] h-[320px] rounded-full"
                    style={{ backgroundColor: isPickup ? "rgba(17,224,197,0.07)" : "rgba(239,68,68,0.06)" }}
                />
                <View className="absolute bottom-0 -left-20 w-[220px] h-[220px] rounded-full bg-[#0A84FF]/5" />
            </View>

            <SafeAreaView className="flex-1">
                {/* ── Header ─────────────────────────────────────────────── */}
                <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-white/[0.06]">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center -ml-1 mr-2"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>

                    {/* Search input */}
                    <View className="flex-1 h-12 bg-[#131D2B]/95 border border-white/[0.08] rounded-2xl px-4 flex-row items-center">
                        {/* Dot indicator */}
                        <View
                            className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0"
                            style={{ backgroundColor: dotColor }}
                        />

                        <TextInput
                            ref={inputRef}
                            className="flex-1 text-white text-[15px]"
                            placeholder={`Search ${label.toLowerCase()}…`}
                            placeholderTextColor="#748096"
                            value={query}
                            onChangeText={search}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                            accessibilityLabel={`Search ${label}`}
                        />

                        {query.length > 0 && (
                            <TouchableOpacity
                                onPress={handleClear}
                                className="w-7 h-7 items-center justify-center"
                                accessibilityLabel="Clear search"
                            >
                                <Feather name="x" size={16} color="#748096" />
                            </TouchableOpacity>
                        )}

                        {loading && (
                            <ActivityIndicator size="small" color="#748096" style={{ marginLeft: 6 }} />
                        )}
                    </View>
                </View>

                {/* ── Label row ──────────────────────────────────────────── */}
                <View className="px-5 pt-5 pb-1 flex-row items-center">
                    <View
                        className="w-5 h-5 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: `${dotColor}20` }}
                    >
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                    </View>
                    <Text className="text-[#748096] text-[12px] uppercase tracking-widest font-semibold">
                        {label}
                    </Text>
                </View>

                {/* ── Use current location ─────────────────────────────── */}
                <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    disabled={geoLoading}
                    activeOpacity={0.8}
                    className="mx-5 mt-3 mb-2 h-12 bg-[#11E0C5]/10 border border-[#11E0C5]/20 rounded-2xl flex-row items-center px-4"
                    accessibilityLabel="Use my current location"
                >
                    {geoLoading ? (
                        <ActivityIndicator size="small" color="#11E0C5" />
                    ) : (
                        <Ionicons name="locate-outline" size={18} color="#11E0C5" />
                    )}
                    <Text className="text-[#11E0C5] text-[14px] font-semibold ml-3">
                        {geoLoading ? "Detecting location…" : "Use my current location"}
                    </Text>
                </TouchableOpacity>

                {/* ── Separator ─────────────────────────────────────────── */}
                {predictions.length > 0 && (
                    <View className="mx-5 my-3 flex-row items-center gap-x-3">
                        <View className="flex-1 h-[0.5px] bg-white/10" />
                        <Text className="text-[#748096] text-[10px] uppercase tracking-widest">
                            Suggestions
                        </Text>
                        <View className="flex-1 h-[0.5px] bg-white/10" />
                    </View>
                )}

                {/* ── Error ─────────────────────────────────────────────── */}
                {error && (
                    <View className="mx-5 mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex-row items-center">
                        <Feather name="alert-circle" size={16} color="#EF4444" />
                        <Text className="text-red-400 text-[13px] ml-3 flex-1">{error}</Text>
                    </View>
                )}

                {/* ── Empty state (after typing) ────────────────────────── */}
                {!loading && !error && query.trim().length >= 2 && predictions.length === 0 && (
                    <View className="flex-1 items-center justify-center pb-24">
                        <View className="w-14 h-14 rounded-2xl bg-white/5 items-center justify-center mb-4">
                            <Feather name="map-pin" size={24} color="#748096" />
                        </View>
                        <Text className="text-white font-semibold text-[15px]">No results found</Text>
                        <Text className="text-[#748096] text-[13px] mt-1.5 text-center max-w-[220px]">
                            Try a different spelling or a nearby landmark.
                        </Text>
                    </View>
                )}

                {/* ── Results ───────────────────────────────────────────── */}
                <FlatList
                    data={predictions}
                    keyExtractor={(item) => item.place_id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => handleSelectPrediction(item)}
                            accessibilityLabel={item.description}
                            className="flex-row items-center py-4"
                            style={{
                                borderBottomWidth: index < predictions.length - 1 ? 0.5 : 0,
                                borderBottomColor: "rgba(255,255,255,0.06)",
                            }}
                        >
                            {/* Icon */}
                            <View className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.07] items-center justify-center mr-4 flex-shrink-0">
                                <Feather name="map-pin" size={15} color={dotColor} />
                            </View>

                            {/* Text */}
                            <View className="flex-1">
                                <Text
                                    className="text-white text-[14px] font-semibold"
                                    numberOfLines={1}
                                >
                                    {item.structured_formatting?.main_text ?? item.description}
                                </Text>
                                {item.structured_formatting?.secondary_text ? (
                                    <Text
                                        className="text-[#748096] text-[12px] mt-0.5"
                                        numberOfLines={1}
                                    >
                                        {item.structured_formatting.secondary_text}
                                    </Text>
                                ) : null}
                            </View>

                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
