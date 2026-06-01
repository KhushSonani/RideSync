import { ApiError } from "../utils/ApiError.js"

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            throw new ApiError(403, "Access denied: User not authenticated");
        }
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `Access denied: ${req.user.role} role is not authorized`);
        }
        next();
    }
}
export const requireRider = authorizeRoles("rider");
export const requireDriver = authorizeRoles("driver");
export const requireAdmin = authorizeRoles("admin");