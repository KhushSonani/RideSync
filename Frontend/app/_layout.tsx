import "@/global.css";

import { Stack } from "expo-router";
import { LocationProvider } from "@/store/LocationContext";

export default function RootLayout() {
  return (
    <LocationProvider>
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
        <Stack.Screen
          name="onboarding"
          options={{ animation: "slide_from_right", gestureEnabled: false }}
        />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(rider)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen
          name="location-search"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="sandbox" />
      </Stack>
    </LocationProvider>
  );
}