import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema({
    number:{
        type:String,
        trim:true,
        required:[true,"License number is required"],
    },
    fileUrl:{
        type:String, // uploaded to S3
        required:[true,"License document is required"]
    },
    expiryDate:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        enum:["pending","under_review","verified","rejected","expired"],
        default:"pending"
    },
},{_id : false});

const driverSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true,
    },
    vehicle:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Vehicle",
        required:true,
    },
    license: {
       type : licenseSchema,
       default : () => ({}),
    },
    driverVerified:{
        type:String,
        enum:["pending","under_review","verified","rejected"],
        default:"pending"
    },
    verificationNote:{
        type:String,
        trim:true,
        default:null
    },
    isActive:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["available","busy"],
        default:"available"
    },
    location:{
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude] — MongoDB is lng first
            default: [0, 0],
        },
    },

},{timestamps:true});

driverSchema.index({user:1});
driverSchema.index({status:1});
driverSchema.index({vehicle:1});
driverSchema.index({isActive:1});
driverSchema.index({driverVerified:1});
driverSchema.index({location:"2dsphere"});
driverSchema.index({"license.expiryDate":1});
driverSchema.index({driverVerified:1,isActive:1});
driverSchema.index({"license.number":1},{unique:true,sparse:true});

export const Driver = mongoose.model("Driver",driverSchema);