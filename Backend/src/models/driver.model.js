import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema({
    number: {
        type: String,
        trim: true,
        // required:[true,"License number is required"],
    },
    file: {
        url: {
            type: String,
            default: null,
        },
        public_id: {
            type: String,
            default: null,
        }
    },
    expiryDate: {
        type: Date,
        // required:true
    },
    status: {
        type: String,
        enum: ["pending", "under_review", "verified", "rejected", "expired"],
        default: "pending"
    },
}, { _id: false });

const driverSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null,
    },
    license: {
        type: licenseSchema,
        default: () => ({}),
    },
    driverVerified: {
        type: String,
        enum: ["pending", "under_review", "verified", "rejected"],
        default: "pending"
    },
    verificationNote: {
        type: String,
        trim: true,
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "offline"
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude] — MongoDB is lng first
            default: [0, 0],
        },
    },

}, { timestamps: true });

// DriverSchema.index({status:1});
// DriverSchema.index({vehicle:1});
// DriverSchema.index({driverVerified:1});
// DriverSchema.index({"license.expiryDate":1});
// driverSchema.index({user:1});
driverSchema.index({ location: "2dsphere" });
driverSchema.index({ "license.number": 1 }, { unique: true, sparse: true });
driverSchema.index({ isActive: 1, status: 1 });
driverSchema.index({ driverVerified: 1, isActive: 1 });

driverSchema.pre("save", function() {
    if (this.license && this.license.status === "rejected") {
        this.driverVerified = "rejected";
        this.isActive = false;
    }
});

export const Driver = mongoose.model("Driver", driverSchema);