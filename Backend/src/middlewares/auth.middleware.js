import { User } from "../models/user.model.js";
import {asynchandler, ApiError} from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const authUser = asynchandler(async(req,res,next) => {
    const token = 
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401,"Unauthorized access, token missing");
        }
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken");

        if(!user){
            throw new ApiError(401,"Unauthorized access, user not found!");
        }

        req.user = user;
        return next();

});