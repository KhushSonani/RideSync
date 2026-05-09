import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { config } from "../config/env.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req,res,next) => {
    const token = 
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401,"Unauthorized access, token missing");
        }
        let decodedToken;
        try {
            decodedToken = jwt.verify(token,config.ACCESS_TOKEN_SECRET);
        } catch (err) {
            throw new ApiError(401, "Invalid or expired token.");
        }
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken");

        if(!user){
            throw new ApiError(401,"Unauthorized access, user not found!");
        }

        req.user = user;
        return next();

});