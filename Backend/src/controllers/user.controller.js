import { User } from "../models/user.model.js";
// import { Driver } from "../models/driver.model.js";
import { generateAccessToken , generateRefreshToken } from "../utils/token.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const loginUser = asyncHandler(async (req,res) => {
    
    const { email, password } = req.body;
    if(!email || !password){
        throw new ApiError(400,"Email and password are required! ");
    }

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
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000   
    };
    await user.save({validateBeforeSave:false});
    
    const data = {
        accessToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
        },
    };

    // if (user.role === "driver") {
    //     const driver = await Driver.findOne({ user: user._id })
    //                             .select("driverVerified verificationNote isActive");
    //     if (driver) {
    //         data.driver = {
    //             driverVerified: driver.driverVerified,
    //             verificationNote: driver.verificationNote,
    //             isActive: driver.isActive,
    //         };
    //     }
    // }

    return res
    .status(200)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,data,"Login successfull."));

});