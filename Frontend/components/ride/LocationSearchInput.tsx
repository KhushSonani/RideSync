import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

interface LocationSearchInputProps {
    /** Label shown above the input */
    label?: string;
    /** Placeholder text when value is empty */
    placeholder: string;
    /** Currently selected address string */
    value: string;
    /**
     * Called when the user taps the field.
     * Connect to Google Places autocomplete sheet here.
     */
    onPress?: () => void;
    /** Coloured dot on the left (pickup = #11E0C5, drop = #EF4444) */
    dotColor?: string;
    disabled?: boolean;
    /** Show a spinner inside the field (e.g. while resolving current location) */
    loading?: boolean;
}

/**
 * A pressable address search bar that mimics a text input.
 * Does NOT contain a real TextInput — the intent is to open a full-screen
 * Google Places search sheet when pressed.
 *
 * Integration TODO:
 *  - onPress → open Google Places autocomplete modal
 *  - Pass selected place's address string back as `value`
 */
const LocationSearchInput = memo(function LocationSearchInput({
    label,
    placeholder,
    value,
    onPress,
    dotColor = "#11E0C5",
    disabled = false,
    loading = false,
}: LocationSearchInputProps) {
    return (
        <View>
            {label ? (
                <Text className="text-[#748096] text-[11px] uppercase tracking-wider mb-2 px-1">
                    {label}
                </Text>
            ) : null}

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                disabled={disabled || loading}
                className="h-14 bg-[#131D2B]/95 border border-white/[0.06] rounded-2xl px-4 flex-row items-center"
                accessible
                accessibilityRole="button"
                accessibilityLabel={value || placeholder}
                accessibilityHint="Tap to search for a location"
            >
                {/* Dot */}
                <View
                    className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                />

                {/* Address text */}
                <Text
                    className="flex-1 text-[15px]"
                    style={{ color: value ? "#FFFFFF" : "#748096" }}
                    numberOfLines={1}
                >
                    {value || placeholder}
                </Text>

                {/* Right icon */}
                {loading ? (
                    <ActivityIndicator size="small" color="#748096" />
                ) : (
                    <Feather name="search" size={15} color="#748096" />
                )}
            </TouchableOpacity>
        </View>
    );
});

export default LocationSearchInput;
