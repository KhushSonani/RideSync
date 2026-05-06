import { User } from "../models/user.model.js";

export const createUser = async (data)=>{
    return await User.create(data);
};