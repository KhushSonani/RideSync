import "@/global.css";
import { refreshAccessToken } from "@/services/auth";
import { api } from "@/services/api";
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  getAccessToken,
  getUserRole,
  clearTokens
} from "@/services/storage";
import { getDriverStatus } from "@/services/driver";
import { Link, router, useRootNavigationState } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_KEY } from "@/app/onboarding";
import { registerPushTokenWithServer } from "@/services/notifications";

export default function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    checkUserAuth();
  }, [rootNavigationState?.key]);

  const checkUserAuth = async () => {
    try {
      // ── Onboarding gate ────────────────────────────────────────────────
      // Show onboarding only on the very first launch (key not yet set).
      const onboarded = await SecureStore.getItemAsync(ONBOARDING_KEY);
      if (!onboarded) {
        router.replace("/onboarding");
        return;
      }

      // ── Auth gate ──────────────────────────────────────────────────────
      let accessToken = await getAccessToken();
      if (!accessToken) {
        accessToken = await refreshAccessToken();
      }

      if (accessToken) {
        // Register push token now that we have a valid auth token.
        // Fire-and-forget — failure never blocks navigation.
        registerPushTokenWithServer();

        const role = await getUserRole();
        if (role === "rider") {
          try {
            const rideRes = await api.get("/rides/current");
            const activeRide = rideRes.data?.data;
            if (activeRide) {
              const status = activeRide.status;
              if (status === "requested") {
                router.replace("/(rider)/searching-driver");
              } else if (status === "accepted") {
                router.replace("/(rider)/driver-assigned");
              } else if (status === "arriving" || status === "started") {
                router.replace("/(rider)/live-tracking");
              } else {
                router.replace("/(rider)/home");
              }
            } else {
              router.replace("/(rider)/home");
            }
          } catch (e) {
            console.log("FETCH ACTIVE RIDE ERROR ON STARTUP:", e);
            router.replace("/(rider)/home");
          }
          return;
        } else if (role === "driver") {
          try {
            const statusData = await getDriverStatus();
            if (statusData?.driverVerified === "verified") {
              router.replace("/(driver)/home");
            } else {
              router.replace("/(driver)/documents");
            }
          } catch (e) {
            console.log("FETCH DRIVER STATUS ERROR ON STARTUP:", e);
            router.replace("/(driver)/documents");
          }
          return;
        } else {
          await clearTokens();
        }
      }
    } catch (err) {
      console.log(
        "CHECK USER AUTH ERROR:",
        err
      );
    } finally {
      setCheckingAuth(false);
    }
  };

  if (checkingAuth) {
    return (
      <View className="flex-1 bg-[#070B12] items-center justify-center">
        <ActivityIndicator
          size="large"
          color="#11E0C5"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#070B12]">
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <SafeAreaView className="absolute top-4 right-4 z-20">
        <Link href="/sandbox" asChild>
          <TouchableOpacity
            className="w-10 h-10 bg-[#131D2B]/95 rounded-full border border-white/[0.08] items-center justify-center shadow-lg"
            activeOpacity={0.8}
            accessibilityLabel="View UI Sandbox"
          >
            <Feather name="layers" size={18} color="#11E0C5" />
          </TouchableOpacity>
        </Link>
      </SafeAreaView>

      {/* PREMIUM BACKGROUND */}
      <View className="absolute inset-0 overflow-hidden">

        {/* Main Glow */}
        <View className="absolute -top-32 -right-16 w-[420px] h-[420px] rounded-full bg-[#00CBB4]/15" />

        {/* Blue Glow */}
        <View className="absolute bottom-[-80px] -left-20 w-[260px] h-[260px] rounded-full bg-[#0A84FF]/10" />

        {/* Ring Effect */}
        <View className="absolute top-[-40px] right-[-50px] w-[300px] h-[300px] rounded-full bg-[#144B45]/20 items-center justify-center">
          <View className="w-[220px] h-[220px] rounded-full bg-[#1D6B61]/15" />
        </View>

      </View>

      <View className="flex-1 px-6 items-center justify-center">

        {/* LOGO */}
        <View className="items-center">

          {/* OUTER LOGO */}
          <View className="w-32 h-32 rounded-[38px] bg-[#0D1420]/90 border border-white/[0.08] items-center justify-center shadow-2xl">

            {/* INNER GLOW */}
            <View className="w-24 h-24 rounded-[28px] bg-[#11E0C5]/15 items-center justify-center border border-[#11E0C5]/20">

              {/* LOGO ICON */}
              <Text className="text-[42px]">
                🚘
              </Text>

            </View>

          </View>

          {/* APP NAME */}
          <Text className="text-white text-[42px] font-bold tracking-tight mt-8">
            RideSync
          </Text>

          {/* SUBTITLE */}
          <Text className="text-[#748096] text-[15px] text-center leading-7 mt-4 max-w-[300px]">
            Premium ride booking experience with modern mobility and seamless travel.
          </Text>

        </View>

        {/* BUTTONS */}
        <View className="w-full mt-16">

          {/* SIGN IN */}
          <Link href="/(auth)/signin" asChild>

            <TouchableOpacity
              activeOpacity={0.85}
              className="h-14 bg-[#11E0C5] rounded-2xl items-center justify-center border border-[#6FFFEF]/10"
            >

              <Text className="text-[#071018] text-[16px] font-bold">
                Sign In
              </Text>

            </TouchableOpacity>

          </Link>

          {/* SIGN UP */}
          <Link href="/(auth)/signup" asChild>

            <TouchableOpacity
              activeOpacity={0.85}
              className="h-14 bg-[#131D2B]/95 border border-white/[0.06] rounded-2xl items-center justify-center mt-4"
            >

              <Text className="text-white text-[16px] font-semibold">
                Create Account
              </Text>

            </TouchableOpacity>

          </Link>

        </View>

      </View>

    </View>
  );
}