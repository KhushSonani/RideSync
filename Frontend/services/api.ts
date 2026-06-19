import axios from 'axios';
import { getAccessToken, clearTokens } from './storage';
import { refreshAccessToken } from './auth';
import { router } from 'expo-router';


const NGROK_URL = 'https://myspace-clumsy-sprawl.ngrok-free.dev/api/v1';
export const api = axios.create({
    baseURL: NGROK_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
    timeout: 15000,
});


let isRefreshing = false;
let failedQueue: any[] = [];
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        const hasAuth = config.headers.Authorization || config.headers.authorization;
        // Only set the Authorization header if it hasn't been set yet (e.g. by a retry request)
        if (token && !hasAuth) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only retry on 401 Unauthorized (expired/invalid token).
        // 403 Forbidden is a legitimate permissions error (e.g., unverified driver
        // hitting requireVerifiedDriver) and must NOT trigger a token refresh or
        // log out the user.
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/users/login") &&
            !originalRequest.url.includes("/users/signup") &&
            !originalRequest.url.includes("/users/forgot-password") &&
            !originalRequest.url.includes("/users/reset-password")
        ) {

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;
            try {
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    processQueue(null, newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } else {
                    processQueue(new Error("Token refresh failed"), null);
                }
            } catch (refreshErr) {
                processQueue(refreshErr, null);
            } finally {
                isRefreshing = false;
            }

            // Token refresh failed — clear credentials and redirect to welcome screen
            console.warn("[API] Token refresh failed. Logging out.");
            await clearTokens();
            router.replace('/');
        }
        return Promise.reject(error);
    }
);