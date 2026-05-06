import { Vehicle } from "../models/vehicle.model.js";

export const createVehicle = async(data) => {
    return await Vehicle.create(data);
}