import { api } from "./api";

export interface DriverStatusResponse {
    status: "available" | "busy" | "offline";
    isActive: boolean;
    driverVerified: "pending" | "under_review" | "verified" | "rejected";
    verificationNote: string | null;
    vehicleVerified?: "pending" | "under_review" | "verified" | "rejected";
}

export const getDriverProfile = async () => {
    const response = await api.get("/drivers/profile");
    return response.data;
};

export const getDriverStatus = async (): Promise<DriverStatusResponse> => {
    const response = await api.get("/drivers/status");
    return response.data.data;
};

export const updateDriverStatus = async (status: "available" | "busy" | "offline") => {
    const response = await api.put("/drivers/status", { status });
    return response.data;
};

export const uploadLicense = async (formData: FormData) => {
    const response = await api.post("/drivers/documents/license", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const uploadVehicleDocs = async (formData: FormData) => {
    const response = await api.post("/drivers/documents/vehicle", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};
