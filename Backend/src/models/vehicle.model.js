import mongoose from "mongoose";

const DOC_STATUSES = ["pending", "under_review", "verified", "rejected", "expired"];

const rcDocSchema = new mongoose.Schema({
    number: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String, // S3 URL — set after upload
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
},{_id : false});

const insuranceDocSchema = new mongoose.Schema({
    provider: {
      type: String,
      trim: true,
    },
    policyNumber: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String, // S3 URL
    },
    expiryDate: {
      type: Date, // checked by node-cron daily job
    },
    status: {
      type: String,
      enum: DOC_STATUSES,
      default: "pending",
    },
},{_id : false});

const pucDocSchema = new mongoose.Schema({
    fileUrl: {
      type: String, // S3 URL — renews every 6 months
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: DOC_STATUSES,
      default: "pending",
    },
},{_id : false});

const permitDocSchema = new mongoose.Schema({
    type: {
      type: String,
      trim: true, // e.g. "yellow-plate commercial"
    },
    fileUrl: {
      type: String, // S3 URL
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: DOC_STATUSES,
      default: "pending",
    },
},{_id : false});


const vehicleSchema = new mongoose.Schema({
    make:{
        type:String,
        required:[true,"Vehicle make is required"],
        trim:true,
    },
    model:{
        type:String,
        required:[true, "Vehicle model is required"],
        trim:true,
    },
    color:{
        type:String,
        required:[true, "Vehicle color is required"],
        trim:true,
    },
    year:{
        type:Number,
        required:[true, "Vehicle year is required"],
        min: [1980, "Year seems too old"],
        max: [new Date().getFullYear()+1, "Year cannot be in the future"],
    },
    plate:{
        type: String,
        required: [true, "License plate is required"],
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
    },
    vehicleType:{
        type:String,
        required: [true, "Vehicle type is required"],
        enum: {
            values: ["car", "bike", "scooter", "auto"],
            message: "vehicleType must be car, bike, scooter, or auto",
        },
    },
    capacity:{
        type: Number,
        required: [true, "Passenger capacity is required"],
        min:  [1, "Capacity must be at least 1"],
    },
    vehiclePhoto:{
        type: String,
        default: null,
    },
    rc: {
        type: rcDocSchema,
        default: () => ({}), // initialise with defaults so sub-fields exist
    },
    insurance: {
        type: insuranceDocSchema,
        default: () => ({}),
    },
    puc: {
        type: pucDocSchema,
        default: () => ({})
    },
    permit: {
        type: permitDocSchema,
        default: () => ({})
    },
    vehicleVerified:{
        type: String,
        enum: {
            values: ["pending", "under_review", "verified", "rejected"],
            message: "Invalid verification status",
        },
        default: "pending"
    },
    verificationNote:{
        type: String,
        trim: true,
        default: null,
    }

},{timestamps:true});


// vehicleSchema.index({plate:1});
vehicleSchema.index({vehicleVerified:1});
vehicleSchema.index({ "insurance.expiryDate": 1 });
vehicleSchema.index({ "puc.expiryDate": 1 });

export const Vehicle = mongoose.model("Vehicle",vehicleSchema);