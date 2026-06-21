import { razorpay } from "../config/razorpay.js";
import crypto from "crypto";
import { Ride } from "../models/ride.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getIO } from "../Socket/socket.js";
import { SOCKET_EVENTS } from "../Socket/socket.events.js";
import { sendPaymentReceived } from "../services/notification.service.js";

export const createOrder = asyncHandler(async (req, res) => {
    const { amount, rideId } = req.body;

    if (!amount || !rideId) {
        throw new ApiError(400, "Amount and rideId are required");
    }

    const ride = await Ride.findOne({ _id: rideId, rider: req.user._id });
    if (!ride) {
        throw new ApiError(404, "Ride not found or you are not authorized");
    }

    if (ride.status !== "completed") {
        throw new ApiError(400, "Payment can only be processed after the ride is completed");
    }

    // Reuse existing order if present and unpaid
    if (ride.razorpayOrderId && ride.paymentStatus !== "paid") {
        return res.status(200).json(
            new ApiResponse(200, { order: { id: ride.razorpayOrderId } }, "Existing order retrieved")
        );
    }

    try {
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: `ride_${rideId}_${Date.now()}`
        });

        await Ride.findByIdAndUpdate(rideId, { razorpayOrderId: order.id });

        return res.status(200).json(
            new ApiResponse(200, { order }, "Order created successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while creating the order");
    }
});

export const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        rideId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !rideId) {
        throw new ApiError(400, "Missing required payment details");
    }

    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
        throw new ApiError(400, "Invalid payment signature");
    }

    const updatedRide = await Ride.findOneAndUpdate(
        {
            _id: rideId,
            rider: req.user._id,
            paymentStatus: { $ne: "paid" }
        },
        {
            $set: {
                paymentStatus: "paid",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
            }
        },
        { new: true }
    );

    if (!updatedRide) {
        // Handle idempotent case cleanly
        const existingRide = await Ride.findById(rideId);
        if (!existingRide) {
             throw new ApiError(404, "Ride not found");
        }
        if (existingRide.rider?.toString() !== req.user._id.toString()) {
             throw new ApiError(403, "You are not authorized for this ride");
        }
        if (existingRide.paymentStatus === "paid") {
             return res.status(200).json(
                 new ApiResponse(200, { ride: existingRide }, "Payment already verified")
             );
        }
        throw new ApiError(400, "Failed to update payment status");
    }

    // Emit socket event
    getIO().to(`ride:${rideId}`).emit(SOCKET_EVENTS.PAYMENT_RECEIVED, {
        _id: updatedRide._id,
        paymentStatus: updatedRide.paymentStatus,
        paymentMethod: updatedRide.paymentMethod,
        fare: updatedRide.fare,
    });

    // Send push notification
    sendPaymentReceived(req.user._id.toString(), updatedRide);

    return res.status(200).json(
        new ApiResponse(200, { ride: updatedRide }, "Payment verified successfully")
    );
});