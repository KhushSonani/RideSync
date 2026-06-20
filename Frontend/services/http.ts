import axios from 'axios';
import { getAccessToken } from './storage';

const NGROK_URL = 'https://myspace-clumsy-sprawl.ngrok-free.dev/api/v1';

export const http = axios.create({
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

http.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        const hasAuth = config.headers.Authorization || config.headers.authorization;
        if (token && !hasAuth) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
