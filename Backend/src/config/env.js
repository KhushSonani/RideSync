import dotenv from "dotenv";

dotenv.config();

const requiredEnvVariables = [
    "PORT",
    "MONGO_URI",
    "CORS_ORIGIN",

    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",

    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",

    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

for (const key of requiredEnvVariables) {

    if (!process.env[key]) {

        console.error(
            `❌ Missing required environment variable: ${key}`
        );
        process.exit(1);
    }
}

export const config = {

    PORT: process.env.PORT,

    MONGO_URI: process.env.MONGO_URI,

    CORS_ORIGIN: process.env.CORS_ORIGIN,

    ACCESS_TOKEN_SECRET:
        process.env.ACCESS_TOKEN_SECRET,

    ACCESS_TOKEN_EXPIRY:
        process.env.ACCESS_TOKEN_EXPIRY,

    REFRESH_TOKEN_SECRET:
        process.env.REFRESH_TOKEN_SECRET,

    REFRESH_TOKEN_EXPIRY:
        process.env.REFRESH_TOKEN_EXPIRY,

    CLOUDINARY_CLOUD_NAME:
        process.env.CLOUDINARY_CLOUD_NAME,

    CLOUDINARY_API_KEY:
        process.env.CLOUDINARY_API_KEY,

    CLOUDINARY_API_SECRET:
        process.env.CLOUDINARY_API_SECRET,

    NODE_ENV:
        process.env.NODE_ENV || "development",
};