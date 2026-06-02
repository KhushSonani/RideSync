import "@/global.css";

import { Stack } from "expo-router";

export default function RootLayout() {
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
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(rider)" />
      <Stack.Screen name="(driver)" />
    </Stack>
  );
}