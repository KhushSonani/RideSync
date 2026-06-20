// app.config.js
// Replaces app.json so we can reference process.env variables at build time.
// Expo reads this file instead of app.json when it exists.
//
// Environment variables:
//   EXPO_PUBLIC_GOOGLE_MAPS_KEY  — your Google Maps API key (set in .env)

export default ({ config }) => ({
  ...config,
  name: "RideSync",
  slug: "ridesync",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "ridesync",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        // Reads EXPO_PUBLIC_GOOGLE_MAPS_KEY from .env at build time
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
    },
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-secure-store",
    "expo-font",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "RideSync needs your location to track your position during active rides.",
        locationWhenInUsePermission:
          "RideSync needs your location to track your position during active rides.",
      },
    ],
    [
      "expo-notifications",
      {
        // Android notification icon (monochrome, white on transparent)
        icon: "./assets/images/android-icon-monochrome.png",
        color: "#11E0C5",
        defaultChannel: "default",
        sounds: [],
        enableBackgroundRemoteNotifications: true,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  // Required by getExpoPushTokenAsync() in production builds.
  // Replace with your actual EAS project ID from: https://expo.dev
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
});
