import "@/global.css";

import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade",
                animationDuration: 120,
                contentStyle: {
                    backgroundColor: "#070B12",
                },
            }}
        >
            <Stack.Screen name="signin" />
            <Stack.Screen name="signup" />
        </Stack>
    );
}