import axios from 'axios';
import { getAccessToken, clearTokens } from './storage';
import { refreshAccessToken } from './auth';
import { router } from 'expo-router';

console.log("[API Service] api.ts module loaded!");

const NGROK_URL = 'https://myspace-clumsy-sprawl.ngrok-free.dev/api/v1';
export const api = axios.create({
    baseURL: NGROK_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
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
        console.log(`[API Request Interceptor] Sending request to: ${config.url}`);
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
        console.log("[DEBUG INTERCEPTOR] Error message:", error.message);
        console.log("[DEBUG INTERCEPTOR] Response exists:", !!error.response);
        console.log("[DEBUG INTERCEPTOR] Response status:", error.response?.status);
        console.log("[DEBUG INTERCEPTOR] Response data:", JSON.stringify(error.response?.data));

        const originalRequest = error.config;

        // If error response status is 401 and it's not already retried
        if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403) &&
            !originalRequest._retry
        ) {
            console.log(`[API Interceptor] 401 Unauthorized detected for URL: ${originalRequest.url}`);

            if (isRefreshing) {
                console.log(`[API Interceptor] Token refresh already in progress. Queueing request: ${originalRequest.url}`);
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
            console.log(`[API Interceptor] Initiating token refresh...`);

            try {
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    console.log(`[API Interceptor] Token refresh successful. Processing queued requests.`);
                    processQueue(null, newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } else {
                    console.log(`[API Interceptor] Token refresh returned null.`);
                    processQueue(new Error("Token refresh failed"), null);
                }
            } catch (refreshErr) {
                console.log("[API Interceptor] Token refresh request crashed:", refreshErr);
                processQueue(refreshErr, null);
            } finally {
                isRefreshing = false;
            }

            // If token refresh failed, log out user
            console.log(`[API Interceptor] Token refresh failed completely. Clearing tokens and redirecting to welcome screen.`);
            await clearTokens();
            router.replace('/');
        }
        return Promise.reject(error);
    }
);