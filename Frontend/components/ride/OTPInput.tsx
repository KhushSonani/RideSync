import React, { useRef, useCallback, memo } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    NativeSyntheticEvent,
    TextInputKeyPressEventData,
} from "react-native";

interface OTPInputProps {
    value: string;
    onChange: (otp: string) => void;
    /** Number of digit boxes. Defaults to 6. */
    length?: number;
    disabled?: boolean;
}

/**
 * A row of individual single-digit TextInput boxes for OTP entry.
 *
 * Behaviour:
 *  - Typing a digit auto-advances focus to the next box.
 *  - Pressing Backspace on an empty box moves focus to the previous box.
 *  - `value` is the full numeric string (e.g. "194" for 3 filled boxes).
 *  - `onChange` fires with the full updated string on every keystroke.
 *
 * Integration:
 *  - Pass the returned `value` to the OTP-start-ride API call.
 */
const OTPInput = memo(function OTPInput({
    value,
    onChange,
    length = 6,
    disabled = false,
}: OTPInputProps) {
    const refs = useRef<Array<TextInput | null>>(Array(length).fill(null));

    // Pad / slice so digits array always has exactly `length` elements
    const digits = value
        .replace(/\D/g, "")
        .slice(0, length)
        .padEnd(length, "")
        .split("");

    const handleChange = useCallback(
        (text: string, index: number) => {
            const digit = text.replace(/\D/g, "").slice(-1);
            const next = [...digits];
            next[index] = digit;
            onChange(next.join("").trimEnd());
            if (digit && index < length - 1) {
                refs.current[index + 1]?.focus();
            }
        },
        [digits, length, onChange]
    );

    const handleKeyPress = useCallback(
        (
            e: NativeSyntheticEvent<TextInputKeyPressEventData>,
            index: number
        ) => {
            if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
                refs.current[index - 1]?.focus();
            }
        },
        [digits]
    );

    return (
        <View style={styles.row}>
            {Array.from({ length }).map((_, i) => (
                <TextInput
                    key={i}
                    ref={(r) => {
                        refs.current[i] = r;
                    }}
                    style={[
                        styles.box,
                        digits[i] ? styles.boxFilled : styles.boxEmpty,
                        disabled && styles.boxDisabled,
                    ]}
                    value={digits[i] || ""}
                    onChangeText={(t) => handleChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textContentType="oneTimeCode"
                    selectTextOnFocus
                    editable={!disabled}
                    caretHidden
                    accessible
                    accessibilityLabel={`OTP digit ${i + 1} of ${length}`}
                />
            ))}
        </View>
    );
});

export default OTPInput;

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    box: {
        flex: 1,
        height: 62,
        borderRadius: 16,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    boxEmpty: {
        backgroundColor: "rgba(19,29,43,0.95)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.08)",
    },
    boxFilled: {
        backgroundColor: "rgba(17,224,197,0.10)",
        borderWidth: 1.5,
        borderColor: "rgba(17,224,197,0.40)",
    },
    boxDisabled: {
        opacity: 0.45,
    },
});
