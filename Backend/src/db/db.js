import mongoose from "mongoose";
import { config } from "../config/env.js";

const connectToDb = async()=>{
    try {
        const connectionInstance = await mongoose.connect(config.MONGO_URI);
        console.log(`MongoDB Connected Successfullly !! DB Host : ${connectionInstance.connection.host}`);
    } catch (err) {
        console.error("MongoDb Connection Error !",err.message);
        process.exit(1);
    }
}
export default connectToDb;