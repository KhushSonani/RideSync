import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const authorizeRoles = (...roles) => {
    return asyncHandler(async (req,res,next) => {
        if (!req.user || !req.user.role) {
            throw new ApiError(403, "Access denied: User not authenticated");
        }
        if(!roles.includes(req.user.role)){
            throw new ApiError(403,`Access denied: ${req.user.role} role is not authorized`);
        }
        next();
    });
}