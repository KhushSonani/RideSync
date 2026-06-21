import { body, param, query } from "express-validator";

export const createRideValidator = [
    body("pickup")
        .notEmpty().withMessage("Pickup information is required"),

    body("pickup.address")
        .trim()
        .notEmpty().withMessage("Pickup address is required"),

    body("pickup.location")
        .notEmpty().withMessage("Pickup location is required"),

    body("pickup.location.coordinates")
        .isArray({ min: 2, max: 2 })
        .withMessage("Pickup coordinates must be an array of [longitude, latitude]")
        .custom(coords => {
            if (!coords) return false;
            return coords.every(value => typeof value === "number");
        }),

    body("drop")
        .notEmpty().withMessage("Drop-off information is required"),

    body("drop.address")
        .trim()
        .notEmpty().withMessage("Drop-off address is required"),

    body("drop.location")
        .notEmpty().withMessage("Drop-off location is required"),

    body("drop.location.coordinates")
        .isArray({ min: 2, max: 2 }).withMessage("Drop-off coordinates must be an array of [longitude, latitude]")
        .custom(coords => {
            if (!coords) return false;
            return coords.every(value => typeof value === "number");
        }),

    body("fare")
        .isFloat({ min: 0 }).withMessage("Fare must be a positive number"),

    body("distance")
        .optional()
        .isFloat({ min: 0 }).withMessage("Distance must be a positive number"),

    body("paymentMethod")
        .optional()
        .trim()
        .isIn(["cash", "upi", "card"]).withMessage("Payment method must be cash, upi, or card"),
];

export const startRideValidator = [
    body("otp")
        .trim()
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
        .isNumeric().withMessage("OTP must be numeric"),
];

export const rideIdParamValidator = [
    param("id")
        .isMongoId().withMessage("Invalid ride ID format"),
];

export const cancelRideValidator = [
    param("id")
        .isMongoId().withMessage("Invalid ride ID format"),
    body("cancelReason")
        .optional()
        .trim()
        .isString().withMessage("Cancellation reason must be a string"),
];

export const getRideHistoryValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be a positive integer between 1 and 100"),
];

export const selectPaymentMethodValidator = [
    param("id")
        .isMongoId().withMessage("Invalid ride ID format"),
    body("method")
        .trim()
        .isIn(["cash", "upi", "card"]).withMessage("Payment method must be cash, upi, or card"),
];

export const confirmCashPaymentValidator = [
    param("id")
        .isMongoId().withMessage("Invalid ride ID format"),
];
