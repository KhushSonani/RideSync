import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#0D1420",
                    borderTopWidth: 0,
                    height: 65,
                },
                tabBarActiveTintColor: "#11E0C5",
                tabBarInactiveTintColor: "#748096",
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                }}
            />

            <Tabs.Screen
                name="rides"
                options={{
                    title: "Rides",
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                }}
            />
        </Tabs>
    );
}