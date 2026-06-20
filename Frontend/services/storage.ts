import * as SecureStore from "expo-secure-store";

// SAVE ACCESS TOKEN
export const saveAccessToken = async (token: string) => {
    try {
        await SecureStore.setItemAsync("accessToken", token);
    } catch (error) {
        console.log("SAVE ACCESS TOKEN ERROR:", error);
    }
};

// SAVE REFRESH TOKEN
export const saveRefreshToken = async (token: string) => {
    try {
        await SecureStore.setItemAsync("refreshToken", token);
    } catch (error) {
        console.log("SAVE REFRESH TOKEN ERROR:", error);
    }
};

// GET ACCESS TOKEN
export const getAccessToken = async () => {
    try {
        return await SecureStore.getItemAsync("accessToken");
    } catch (error) {
        console.log("GET ACCESS TOKEN ERROR:", error);
        return null;
    }
};

// GET REFRESH TOKEN
export const getRefreshToken = async () => {
    try {
        return await SecureStore.getItemAsync("refreshToken");
    } catch (error) {
        console.log("GET REFRESH TOKEN ERROR:", error);
        return null;
    }
};

// CLEAR TOKENS
export const clearTokens = async () => {
    try {
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        await SecureStore.deleteItemAsync("userRole");
    } catch (error) {
        console.log("CLEAR TOKENS ERROR:", error);
    }
};
// CLEAR ACCESS TOKEN
export const removeAccessToken = async () => {
    try {
        await SecureStore.deleteItemAsync("accessToken");
    } catch (error) {
        console.log("REMOVE ACCESS TOKEN ERROR:", error);
    }
};
// CLEAR REFRESH TOKEN
export const removeRefreshToken = async () => {
    try {
        await SecureStore.deleteItemAsync("refreshToken");
    } catch (error) {
        console.log("REMOVE REFRESH TOKEN ERROR:", error);
    }
};

// SAVE USER ROLE
export const saveUserRole = async (role: string) => {
    try {
        await SecureStore.setItemAsync("userRole", role);
    } catch (error) {
        console.log("SAVE USER ROLE ERROR:", error);
    }
};

// GET USER ROLE
export const getUserRole = async () => {
    try {
        return await SecureStore.getItemAsync("userRole");
    } catch (error) {
        console.log("GET USER ROLE ERROR:", error);
        return null;
    }
};

// CLEAR USER ROLE
export const clearUserRole = async () => {
    try {
        await SecureStore.deleteItemAsync("userRole");
    } catch (error) {
        console.log("CLEAR USER ROLE ERROR:", error);
    }
};

// ─── Theme Preference ────────────────────────────────────────────────────────

// SAVE THEME ('light' | 'dark')
export const saveThemePreference = async (theme: "light" | "dark") => {
    try {
        await SecureStore.setItemAsync("themePreference", theme);
    } catch (error) {
        console.log("SAVE THEME ERROR:", error);
    }
};

// GET THEME
export const getThemePreference = async (): Promise<"light" | "dark" | null> => {
    try {
        const val = await SecureStore.getItemAsync("themePreference");
        if (val === "light" || val === "dark") return val;
        return null;
    } catch (error) {
        console.log("GET THEME ERROR:", error);
        return null;
    }
};