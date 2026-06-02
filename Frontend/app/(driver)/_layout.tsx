import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function DriverTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#0D1420",
                    borderTopWidth: 0,
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: "#11E0C5",
                tabBarInactiveTintColor: "#748096",
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                }
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


        </Tabs>
    );
}
