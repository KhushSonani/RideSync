import { Router } from "express";
import {
    getUserProfile,
    loginUser,
    logoutUser,
    refreshAccessToken,
    signupUser,
    forgotPassword,
    resetPassword,
    changeCurrentPassword,
    updateUserAvatar
} from "../controllers/user.controller.js";
import { profilePhotoUpload } from "../middlewares/multer.middleware.js";
import {
    loginValidator,
    signupValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changeCurrentPasswordValidator
} from "../validators/auth.validator.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
    "/signup",
    profilePhotoUpload,
    signupValidator,
    signupUser
);
router.post(
    "/login",
    loginValidator,
    loginUser
);
router.get(
    "/profile",
    verifyJWT,
    getUserProfile
);
router.post(
    "/logout",
    verifyJWT,
    logoutUser
);
router.post(
    "/refresh-token",
    refreshAccessToken
);

router.post(
    "/change-password",
    verifyJWT,
    changeCurrentPasswordValidator,
    changeCurrentPassword
);

router.patch(
    "/avatar",
    verifyJWT,
    profilePhotoUpload,
    updateUserAvatar
);
router.post(
    "/forgot-password",
    forgotPasswordValidator,
    forgotPassword
);
router.get(
    "/reset-password/:token",
    (req, res) => {
        const { token } = req.params;
        return res.redirect(`ridesync://reset-password/${token}`);
    }
);

router.post(
    "/reset-password/:token",
    resetPasswordValidator,
    resetPassword
);

export default router;
