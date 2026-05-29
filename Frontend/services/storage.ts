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