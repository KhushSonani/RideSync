import { body } from "express-validator";

export const signupValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required"),

    body("fullname")
        .trim()
        .notEmpty().withMessage("Fullname is required"),

    body("email")
        .trim()
        .isEmail().withMessage("Valid email is required"),

    body("password")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    // body("avatar")
    //     .notEmpty().withMessage("Avatar is required"),

    body("role")
        .optional().isIn(["rider", "driver"]).withMessage("Role must be rider or driver"),

    // ** Driver Vehicle Validation ** //

    body("vehicle").optional().customSanitizer(value => {
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
            throw new Error("Invalid vehicle JSON");
        }
    }),

    body("vehicle.make")
        .if(body("role").equals("driver"))
        .notEmpty(),

    body("vehicle.model")
        .if(body("role").equals("driver"))
        .notEmpty(),

    body("vehicle.color")
        .if(body("role").equals("driver"))
        .notEmpty(),

    body("vehicle.year")
        .if(body("role").equals("driver"))
        .isNumeric(),

    body("vehicle.plate")
        .if(body("role").equals("driver"))
        .notEmpty(),

    body("vehicle.vehicleType")
        .if(body("role").equals("driver"))
        .isIn(["car", "bike", "scooter", "auto"]),

    body("vehicle.capacity")
        .if(body("role").equals("driver"))
        .isNumeric(),



];

export const loginValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),

    body("password")
        .trim()
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("password must be atleast 6 characters long"),
];

export const forgotPasswordValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),
];

export const resetPasswordValidator = [
    body("password")
        .trim()
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
];

export const changeCurrentPasswordValidator = [
    body("oldPassword")
        .trim()
        .notEmpty().withMessage("Old password is required")
        .isLength({ min: 6 }).withMessage("Old password must be at least 6 characters long"),
    
    body("newPassword")
        .trim()
        .notEmpty().withMessage("New password is required")
        .isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
];