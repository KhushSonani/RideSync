import { Router } from "express";
import { loginUser } from "../controllers/user.controller.js";
import { loginValidator } from "../validators/auth.validator.js";

const router = Router();
router.post("/login",loginValidator,loginUser);

export default router;
