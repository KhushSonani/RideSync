import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

import { User } from "../models/user.model.js";
import { Driver } from "../models/driver.model.js";

import { createUser } from "../services/user.service.js";
import { createVehicle } from "../services/vehicle.service.js";
import { createDriver } from "../services/driver.service.js";

import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

import { cookieOptions } from "../constants/cookieOptions.js";
import { config } from "../config/env.js";

export const signupUser = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        throw new ApiError(400, "Validation failed", errors.array());
    }
    const {
        username,
        fullname,
        email,
        password,
        role,
        vehicle
    } = req.body;

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });
    if (existingUser) {
        if (existingUser.email === email) {
            throw new ApiError(400, "Email already exists");
        }
        if (existingUser.username === username) {
            throw new ApiError(400, "Username already exists");
        }
    }

    let avatarData = null;
    if (req.file) {
        avatarData = await uploadToCloudinary(req.file.path, req.file.fieldname);
        if (!avatarData) {
            throw new ApiError(500, "Failed to upload avatar");
        }
    }

    const user = await createUser({
        username,
        fullname,
        email,
        password,
        avatar: avatarData,
        role,
    })
    // let parsedVehicle = null;
    let driverData = null;
    if (role === "driver") {
        // try {
        //     parsedVehicle = JSON.parse(vehicle);
        // } catch (err) {
        //     throw new ApiError(400,"Invalid vehicle data format");
        // }
        // ** Create Vehicle ** //
        const createdVehicle = await createVehicle(vehicle);

        // ** Create Driver ** //
        const driver = await createDriver({
            userId: user._id,
            vehicleId: createdVehicle._id,
        });

        driverData = {
            _id: driver._id,
            driverVerified: driver.driverVerified,
            isActive: driver.isActive,
            vehicle: createdVehicle,
        };
    }

    const accessToken = generateAccessToken({
        _id: user._id,
        role: user.role
    });

    const refreshToken = generateRefreshToken({
        _id: user._id,
        role: user.role
    });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });


    const responseData = {
        accessToken,
        refreshToken,
        user: {
            _id: user._id,
            username: user.username,
            fullname: user.fullname,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
        },
    };

    if (driverData) {
        responseData.driver = driverData;
    }

    return res
        .status(201)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(201, responseData, "User registered successfully.")
        );

});

export const loginUser = asyncHandler(async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        throw new ApiError(401, "Invalid email or password.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password.");
    }

    const accessToken = generateAccessToken({ _id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ _id: user._id, role: user.role });

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    const responseData = {
        accessToken,
        refreshToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
        },
    };

    if (user.role === "driver") {
        const driver = await Driver.findOne({ user: user._id })
            .populate("vehicle")
            .select("driverVerified verificationNote isActive vehicle");
        if (driver) {
            responseData.driver = {
                driverVerified: driver.driverVerified,
                verificationNote: driver.verificationNote,
                isActive: driver.isActive,
                vehicle: driver.vehicle,
            };
        }
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, responseData, "Login successful."));

});

export const getUserProfile = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "User profile fetched successfully")
    )
});

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        }
    );
    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(200, {}, "Logged out successfully")
        );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken =
        req.body.refreshToken || req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            config.REFRESH_TOKEN_SECRET
        );

        const existingUser = await User.findById(decodedToken?._id)
            .select("+refreshToken");


        if (!existingUser) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // console.log("--- BACKEND REFRESH DEBUG ---");
        // console.log("Incoming Refresh Token:", incomingRefreshToken);
        // console.log("DB Stored Refresh Token:", existingUser?.refreshToken);
        // console.log("Token Match Status:", incomingRefreshToken === existingUser?.refreshToken);
        // console.log("------------------------------");

        if (incomingRefreshToken !== existingUser?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const newAccessToken = generateAccessToken({
            _id: existingUser._id,
            role: existingUser.role
        });
        const newRefreshToken = generateRefreshToken({
            _id: existingUser._id,
            role: existingUser.role
        });

        existingUser.refreshToken = newRefreshToken;
        await existingUser.save({ validateBeforeSave: false });

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access token refreshed successfully"
                )
            );
    } catch (err) {
        console.error("BACKEND REFRESH ERROR:", err);
        throw new ApiError(401, err?.message || "Invalid refresh token");
    }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    if (oldPassword === newPassword) {
        throw new ApiError(400, "Old password and new password cannot be same");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid old password");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        );
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User with this email does not exist.");
    }

    // Generate reset token
    const resetToken = user.getForgotPasswordToken();

    // Save user document (validation bypassed since password/etc aren't modified here)
    await user.save({ validateBeforeSave: false });

    // Construct reset URL
    const resetUrl = `${process.env.BASE_URL}/api/v1/users/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) have requested the reset of a password.\n\nPlease make a POST request to:\n\n${resetUrl}\n\nThis reset token will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`;

    try {
        await sendEmail({
            email: user.email,
            subject: "RideSync Password Reset Request",
            message: message
        });

        return res
            .status(200)
            .json(
                new ApiResponse(200, { resetToken }, "Password reset link sent successfully.")
            );
    } catch (error) {
        // Clear reset token if sending email failed
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;
        await user.save({ validateBeforeSave: false });

        throw new ApiError(500, "Email could not be sent. Please try again later.");
    }
});

export const resetPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, "Validation failed", errors.array());
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash the token received in URL params to match the one stored in database
    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // Find the user with matching token and unexpired reset time
    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() }
    }).select("+password");

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset token.");
    }

    // Set new password
    user.password = password;

    // Clear reset token fields
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    // Save the user (this will trigger pre("save") hook to hash password)
    await user.save();

    const accessToken = generateAccessToken({ _id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ _id: user._id, role: user.role });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const responseData = {
        accessToken,
        refreshToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
        },
    };

    if (user.role === "driver") {
        const driver = await Driver.findOne({ user: user._id })
            .populate("vehicle")
            .select("driverVerified verificationNote isActive vehicle");
        if (driver) {
            responseData.driver = {
                driverVerified: driver.driverVerified,
                verificationNote: driver.verificationNote,
                isActive: driver.isActive,
                vehicle: driver.vehicle,
            };
        }
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, responseData, "Password reset successfully. Logged in automatically.")
        );
});