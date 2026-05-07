import { Router } from "express";
import { loginUser, signupUser} from "../controllers/user.controller.js";
import { profilePhotoUpload } from "../middlewares/multer.middleware.js";
import { loginValidator, signupValidator } from "../validators/auth.validator.js";

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

export default router;
