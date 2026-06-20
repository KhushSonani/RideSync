import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from "@/store/ThemeContext";

export default function RiderTabsLayout() {
    const { colorScheme, theme } = useTheme();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Platform.OS === 'ios' ? 30 : 20,
                    left: 20,
                    right: 20,
                    backgroundColor: Platform.OS === 'android' ? (colorScheme === 'dark' ? 'rgba(13,20,32,0.85)' : 'rgba(255,255,255,0.9)') : 'transparent',
                    borderTopWidth: 0,
                    borderWidth: 1,
                    borderColor: "rgba(17,224,197,0.15)",
                    borderRadius: 32,
                    height: 64,
                    paddingBottom: 0,
                    paddingTop: 0,
                    // Elevation for Android shadow
                    elevation: 10,
                    // iOS shadow
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                },
                tabBarBackground: () => (
                    <BlurView
                        tint={colorScheme === 'dark' ? 'dark' : 'light'}
                        intensity={80}
                        style={{ flex: 1, borderRadius: 32, overflow: 'hidden' }}
                    />
                ),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    letterSpacing: 0.2,
                },
                // Active tab indicator pill effect via background
                tabBarItemStyle: {
                    borderRadius: 12,
                    marginHorizontal: 2,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="rides"
                options={{
                    title: "Rides",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "car-sport" : "car-sport-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />

            {/* ── Hidden ride-flow screens (not shown in tab bar) ───────────── */}
            <Tabs.Screen name="create-ride"       options={{ href: null }} />
            <Tabs.Screen name="searching-driver"  options={{ href: null }} />
            <Tabs.Screen name="driver-assigned"   options={{ href: null }} />
            <Tabs.Screen name="live-tracking"     options={{ href: null }} />
            <Tabs.Screen name="ride-complete"     options={{ href: null }} />
        </Tabs>
    );
}
