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

},{timestamps:true});

rideSchema.index({rider:1});
rideSchema.index({driver:1});
rideSchema.index({status:1});
rideSchema.index({"pickup.location":"2dsphere"});
rideSchema.index({ rider: 1, status: 1 });  
rideSchema.index({ driver: 1, status: 1 });

export const Ride = mongoose.model("Ride",rideSchema);