import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from "@/store/ThemeContext";
import { BlurView } from 'expo-blur';

export default function DriverTabsLayout() {
    const { colorScheme, theme } = useTheme();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 85 : 65,
                    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
                    paddingTop: 8,
                    elevation: 0,
                },
                tabBarBackground: () => (
                    <BlurView
                        tint={colorScheme === 'dark' ? 'dark' : 'light'}
                        intensity={80}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            top: 0,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            overflow: 'hidden',
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                            backgroundColor: colorScheme === 'dark' ? 'rgba(7, 16, 24, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                        }}
                    />
                ),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    letterSpacing: 0.2,
                },
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
                name="documents"
                options={{
                    title: "Documents",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "document-text" : "document-text-outline"}
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
            <Tabs.Screen name="ride-request-modal" options={{ href: null }} />
            <Tabs.Screen name="active-ride"        options={{ href: null }} />
            <Tabs.Screen name="otp-verify"         options={{ href: null }} />
            <Tabs.Screen name="ride-complete"      options={{ href: null }} />
        </Tabs>
    );
}
