import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import { User } from "../models/user.model.js";
import { Driver } from "../models/driver.model.js";

import { createUser } from "../services/user.service.js";
import { createVehicle } from "../services/vehicle.service.js";
import { createDriver } from "../services/driver.service.js";

import { generateAccessToken , generateRefreshToken } from "../utils/token.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

import { cookieOptions } from "../constants/cookieOptions.js";
import { config } from "../config/env.js";

export const signupUser = asyncHandler(async (req,res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        throw new ApiError(400,"Validation failed",errors.array());
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
        $or: [ {email} ,{username} ]
    });
    if(existingUser){
        if(existingUser.email === email){
            throw new ApiError(400,"Email already exists");
        }
        if(existingUser.username === username){
            throw new ApiError(400,"Username already exists");
        }
    }

    let avatarData = null;
    if(req.file){
        avatarData = await uploadToCloudinary(req.file.path,req.file.fieldname);
        if(!avatarData){
            throw new ApiError(500,"Failed to upload avatar");
        }
    }

    const user = await createUser({
        username,
        fullname,
        email,
        password,
        avatar:avatarData,
        role,
    })
    // let parsedVehicle = null;
    let driverData = null;
    if(role === "driver"){
        // try {
        //     parsedVehicle = JSON.parse(vehicle);
        // } catch (err) {
        //     throw new ApiError(400,"Invalid vehicle data format");
        // }
        // ** Create Vehicle ** //
        const createdVehicle = await createVehicle(vehicle);

        // ** Create Driver ** //
        const driver = await createDriver({
            userId : user._id,
            vehicleId : createdVehicle._id,
        });

        driverData = {
            _id : driver._id,
            driverVerified : driver.driverVerified,
            isActive : driver.isActive,
            vehicle : createdVehicle,
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

    if(driverData){
        responseData.driver = driverData;
    }

    return res
           .status(201)
           .cookie("refreshToken",refreshToken,cookieOptions)
           .json(
                new ApiResponse(201,responseData,"User registered successfully.")
           );

});

export const loginUser = asyncHandler(async (req,res) => {
    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        throw new ApiError(400,"Validation failed",errors.array());
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if(!user) {
        throw new ApiError(401,"Invalid email or password.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid email or password.");
    }

    const accessToken  = generateAccessToken({ _id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ _id: user._id, role: user.role });

    user.refreshToken = refreshToken;

    await user.save({validateBeforeSave:false});
    
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
    .cookie("refreshToken",refreshToken,cookieOptions)
    .json(new ApiResponse(200,responseData,"Login successful."));
    
});

export const getUserProfile = asyncHandler(async (req,res) => {
    return res.status(200).json(
        new ApiResponse(200,req.user,"User profile fetched successfully")
    )
});

export const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken:1
            }
        }
    );
   return res
        .status(200)
        .clearCookie("refreshToken",cookieOptions)
        .json(
            new ApiResponse(200,{},"Logged out successfully")
        );
}); 

export const refreshAccessToken  = asyncHandler(async (req,res) => {

    const incomingRefreshToken = 
        req.body.refreshToken || req.cookies?.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh token is required");
    }

    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            config.REFRESH_TOKEN_SECRET
        );

        const existingUser = await User.findById(decodedToken?._id)
                                        .select("+refreshToken");
        
        
        if(!existingUser){
            throw new ApiError(401,"Invalid refresh token");
        }

        if(incomingRefreshToken !== existingUser?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used");
        }

        const newAccessToken  = generateAccessToken({
            _id: existingUser._id, 
            role: existingUser.role 
        });
        const newRefreshToken  = generateRefreshToken({
            _id: existingUser._id, 
            role: existingUser.role 
        });

        existingUser.refreshToken = newRefreshToken;
        await existingUser.save({ validateBeforeSave: false });

        return res
            .status(200)
            .cookie("refreshToken",newRefreshToken,cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        newAccessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access token refreshed successfully"
                )
            );
    }catch(err){
        throw new ApiError(401, err?.message || "Invalid refresh token");
    }
});