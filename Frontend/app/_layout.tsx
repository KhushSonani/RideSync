import "@/global.css";

import { Stack } from "expo-router";
import { LocationProvider } from "@/store/LocationContext";
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { handleNotificationTap } from "@/services/notifications";
import { View } from "react-native";
import { ThemeProvider, useTheme } from "@/store/ThemeContext";

function RootApp() {
  const { colorScheme, theme } = useTheme();
  
  // Ref to store the notification response listener
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // ── Notification tap listener ────────────────────────────────────────────
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationTap(response);
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return (
    <LocationProvider>
      <View className="flex-1">
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
      </View>
    </LocationProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootApp />
    </ThemeProvider>
  );
}