import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
        match: [/\S+@\S+\.\S+/, "Email is invalid"],
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required!"],
        minlength: [6, "Password must be at least 6 characters"],
        maxlength: [128, "Password cannot exceed 128 characters"],
        select: false,
    },
    avatar: {
        url: {
            type: String,
            default: null,
        },
        public_id: {
            type: String,
            default: null,
        }
    },
    role: {
        type: String,
        enum: ["rider", "driver", "admin"],
        default: "rider",
    },
    socketId: {
        type: String,
    },
    expoPushToken: {
        type: String,
        default: null,
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    forgotPasswordToken: {
        type: String,
        select: false,
    },
    forgotPasswordExpiry: {
        type: Date,
        select: false,
    }
}, { timestamps: true });

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.getForgotPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.forgotPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
})



export const User = mongoose.model("User", userSchema);