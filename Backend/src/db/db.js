import mongoose from "mongoose";

const connectToDb = async()=>{
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected Successfullly !! DB Host : ${connectionInstance.connection.host}`);
    } catch (err) {
        console.error("MongoDb Connection Error !",err.message);
        process.exit(1);
    }
}
export default connectToDb;