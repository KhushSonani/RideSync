import { Router } from "express";
import { 
    getUserProfile, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    signupUser
} from "../controllers/user.controller.js";
import { profilePhotoUpload } from "../middlewares/multer.middleware.js";
import { loginValidator, signupValidator } from "../validators/auth.validator.js";
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

export default router;
