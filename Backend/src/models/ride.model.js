import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({
    rider:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    driver:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Driver",
        default: null,
    },
    pickup:{
        address:{
            type:String,
            required:true,
            trim:true
        },
        location:{
            type:{
                type:String,
                enum:["Point"],
                required:true,
                default:"Point"
            },
            coordinates:{
                type:[Number], // [lng, lat]
                required:true
            }
        }
    },
    drop:{
        address:{
            type:String,
            required:true,
            trim:true
        },
        location:{
            type:{
                type:String,
                enum:["Point"],
                required:true,
                default:"Point"
            },
            coordinates:{
                type:[Number], // [lng, lat]
                required:true
            }
        }
    },
    fare:{
        type:Number,
        required:true,
        min:0
    },
    distance:{
        type:Number,
        default: null,
    },
    status:{
        type: String,
        enum: {
            values: ["requested", "accepted", "arriving", "started", "completed", "cancelled"],
            message: "Invalid ride status",
        },
        default: "requested",
    },
    otp:{
        type:String,
        select:false,
        default: null,
    },
    acceptedAt: {
        type: Date,
        default: null,
    },
    arrivedAt: {
        type: Date,
        default: null,
    },
    startedAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    cancelledBy: {
        type: String,
        enum: {
            values: ["rider", "driver", "system"],
            message: "Invalid cancelledBy role",
        },
        default: null,
    },
    cancelReason: {
        type: String,
        default: null,
        trim: true,
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "card"],
        default: "cash",
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
    },
    razorpayOrderId: {
        type: String,
        default: null,
    },
    razorpayPaymentId: {
        type: String,
        default: null,
    },
},{timestamps:true});

// rideSchema.index({rider:1});
// rideSchema.index({driver:1});
// rideSchema.index({status:1});
rideSchema.index({ "pickup.location": "2dsphere" });
rideSchema.index({ rider: 1, status: 1 });  
rideSchema.index({ driver: 1, status: 1 });
rideSchema.index({ rider: 1, createdAt: -1 });
rideSchema.index({ driver: 1, createdAt: -1 });

export const Ride = mongoose.model("Ride",rideSchema);