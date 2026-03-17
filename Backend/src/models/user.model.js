import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase:true,
        index:true,
        match: [/\S+@\S+\.\S+/, "Email is invalid"],
    },
    fullname:{
        type: String,
        required: true,
        trim: true, 
    },
    password:{
        type:String,
        required:[true,"Password is required!"],
        select: false,
    },
    avatar: {
        type: String, // cloudinary url
        required: true,
    },
    role:{
        type: String,
        enum: ["rider", "driver"],
        default: "rider",
    },
    socketId:{
        type:String,
    },
    refreshToken:{
        type:String,
    }
},{ timestamps:true });

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.pre("save",async function (){
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password,10);
})



export const User = mongoose.model("User",UserSchema);