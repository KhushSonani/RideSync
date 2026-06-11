import { Driver } from "../models/driver.model.js";
import { config } from "../config/env.js";

export const findNearbyAvailableDrivers = (coordinates, excludeDriverID = null) => {
    const query = {
        status: "available",
        driverVerified: "verified",
        isActive: true,
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates
                },
                $maxDistance: config.DISPATCH_RADIUS_KM * 1000
            }
        }
    };

    if (excludeDriverID) {
        query._id = { $ne: excludeDriverID };
    }

    return Driver.find(query).select("user").lean();
};
