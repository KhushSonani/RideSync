import { Driver } from "../models/driver.model.js";

export const createDriver = async({ userId,vehicleId }) => {
    return await Driver.create({
        user : userId,
        vehicle : vehicleId,
    });
};