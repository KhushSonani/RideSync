import axios from 'axios';

import {
    getRefreshToken,
    saveAccessToken,
    saveRefreshToken,
    removeAccessToken,
    removeRefreshToken
} from "@/services/storage";

const NGROK_URL =
    'https://myspace-clumsy-sprawl.ngrok-free.dev/api/v1';

export const refreshAccessToken = async () => {
    console.log("[Auth Service] refreshAccessToken starting...");
    try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
            console.log("[Auth Service] No refresh token found in storage.");
            return null;
        }
        console.log("[Auth Service] Refresh token found. Sending request to backend...");

        const response = await axios.post(
            `${NGROK_URL}/users/refresh-token`,
            {
                refreshToken
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                timeout: 15000,
            }
        );

        console.log("[Auth Service] Backend response received:", response.data);

        const {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        } = response.data.data;

        await saveAccessToken(newAccessToken);
        await saveRefreshToken(newRefreshToken);

        console.log("[Auth Service] New tokens saved successfully.");

        // Re-register push token now that we have a fresh auth token.
        // Fire-and-forget — never blocks or throws.
        import("@/services/notifications").then(mod => {
            mod.registerPushTokenWithServer();
        }).catch(err => console.log("Failed to load notifications module", err));

        return newAccessToken;

    } catch (error: any) {
        console.log(
            "[Auth Service] REFRESH TOKEN API ERROR:",
            error?.response?.data || error.message
        );

        await removeAccessToken();
        await removeRefreshToken();

        return null;
    }
};