import "@/global.css";

import { Stack } from "expo-router";
import { LocationProvider } from "@/store/LocationContext";
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { handleNotificationTap } from "@/services/notifications";

export default function RootLayout() {
  // Ref to store the notification response listener
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // ── Notification tap listener ────────────────────────────────────────────
    // Fires when the user taps a notification (app in background or killed).
    // Uses the existing GET /rides/current recovery API to determine the
    // correct screen — no stale data from the notification payload.
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