import "@/global.css";

import { Stack } from "expo-router";
import { useTheme } from "@/store/ThemeContext";

export default function AuthLayout() {
    const { colorScheme, theme } = useTheme();
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade",
                animationDuration: 120,
                contentStyle: {
                    backgroundColor: theme.colors.background,
                },
            }}
        >
            <Stack.Screen name="signin" />
            <Stack.Screen name="signup" />
        </Stack>
    );
}