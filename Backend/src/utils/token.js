import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const generateAccessToken = (user) =>{
    return jwt.sign(
        {
            _id : user._id,
            role: user.role,
        },
        config.ACCESS_TOKEN_SECRET,
        {
            expiresIn: config.ACCESS_TOKEN_EXPIRY,
        },
    );
};

export const generateRefreshToken = (user) =>{
    return jwt.sign(
        {
            _id : user._id,
            role: user.role,
        },
        config.REFRESH_TOKEN_SECRET,
        {
            expiresIn: config.REFRESH_TOKEN_EXPIRY,
        },
    );
};