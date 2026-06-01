import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Driver } from "../models/driver.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// Route  : GET /api/driver/profile
// Chain  : authUser → requireDriver → [this]

export const getDriverProfile = asyncHandler(async (req, res) => {
    const driver = await Driver.findOne({ user: req.user._id })
        .populate("user", "-password -refreshToken")
        .populate("vehicle");

    if (!driver) {
        throw new ApiError(404, "Driver profile not found");
    }

    return res.status(200).json(
        new ApiResponse(200, driver, "Driver profile fetched successfully")
    );
});

// Route  : GET /api/driver/status
// Chain  : authUser → requireDriver → [this]

export const getDriverStatus = asyncHandler(async (req, res) => {
    const driver = await Driver.findOne({ user: req.user._id })
        .populate("vehicle", "vehicleVerified")
        .select("status isActive driverVerified verificationNote");

    if (!driver) { throw new ApiError(404, "Driver not found"); }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: driver.status,
                isActive: driver.isActive,
                driverVerified: driver.driverVerified,
                verificationNote: driver.verificationNote,
                vehicleVerified: driver.vehicle?.vehicleVerified,
            },
            "Driver status fetched successfully"
        )
    );
});

// Route  : PUT /api/driver/status
// Chain  : authUser → requireDriver → requireVerifiedDriver → [this]
// requireVerifiedDriver already guarantees:
//   • driverVerified  === "verified"
//   • vehicleVerified === "verified"
//   • isActive        === true
//   • no documents expired
//   • attaches req.driver (populated with vehicle)
// Status semantics:
//   "available" — driver is accepting new ride requests (driver sets this)
//   "offline"   — driver is not accepting rides      (driver sets this)
//   "busy"      — driver is on an active ride        (system sets this in ride controller)

export const updateDriverStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status) {
        throw new ApiError(400, "Status is required");
    }

    if (!["available", "busy", "offline"].includes(status)) {
        throw new ApiError(400, 'Status must be "available", "busy", or "offline"');
    }
    // Driver Attached by Verify middleware
    const driver = req.driver;

    driver.status = status;
    await driver.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { status: driver.status },
            "Driver status updated successfully"
        )
    );
});

// Route  : POST /api/driver/documents/license
// Chain  : authUser → requireDriver → uploadLicenseMiddleware → [this]
// No requireVerifiedDriver — uploading docs is how a driver gets verified.
// req.file.location = S3 URL (set by multer-s3)

export const uploadLicense = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "License file is required");
    }

    const { licenseNumber, licenseExpiryDate } = req.body;

    if (!licenseNumber || !licenseExpiryDate) {
        throw new ApiError(400, "License number and expiry date are required");
    }
    const licenseRegex = /^[A-Z]{2}[0-9]{13}$/;
    if (!licenseRegex.test(licenseNumber)) {
        throw new ApiError(400, "Invalid license number format");
    }


    const expiry = new Date(licenseExpiryDate);
    if (isNaN(expiry.getTime())) {
        throw new ApiError(400, "Invalid license expiry date");
    }

    if (expiry < new Date()) {
        throw new ApiError(400, "License is already expired — upload a valid one");
    }

    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
        throw new ApiError(404, "Driver not found");
    }

    if (driver.license?.file?.public_id) {
        await deleteFromCloudinary(driver.license.file.public_id);
    }
    const uploaded = await uploadToCloudinary(req.file.path, req.file.fieldname);

    driver.license.number = licenseNumber;
    driver.license.file.url = uploaded.url;
    driver.license.file.public_id = uploaded.public_id;
    driver.license.expiryDate = expiry;
    driver.license.status = "pending";

    // Re-upload resets overall verification — admin must re-review
    driver.driverVerified = "pending";
    driver.verificationNote = undefined;  // clear any previous rejection note
    driver.isActive = false;      // lock until re-verified

    await driver.save();

    return res.status(200).json(
        new ApiResponse(
            200, {
            license: driver.license,
            driverVerified: driver.driverVerified,
        }, "License uploaded successfully — pending admin review")
    );
});

// Route  : POST /api/driver/documents/vehicle
// Chain  : authUser → requireDriver → uploadVehicleDocsMiddleware → [this]
// No requireVerifiedDriver — uploading docs is part of the onboarding flow.
//
// All four sub-docs are optional per request:
//   • First registration  → driver sends all four at once
//   • Doc renewal         → driver sends only the expired one
//
// multer fields() populates req.files as:
//   { rc: [FileObj], insurance: [FileObj], puc: [FileObj], permit: [FileObj] }
//   FileObj.location = S3 URL (multer-s3)

export const uploadVehicleDocs = asyncHandler(async (req, res) => {
    const files = req.files;

    if (!files || Object.keys(files).length === 0) {
        throw new ApiError(400, "At least one document file is required");
    }

    const driver = await Driver.findOne({ user: req.user._id }).populate("vehicle");
    if (!driver) {
        throw new ApiError(404, "Driver not found");
    }
    if (!driver.vehicle) {
        throw new ApiError(404, "No vehicle linked to this driver — contact support");
    }

    const vehicle = driver.vehicle;

    // RC (Registration Certificate)
    // Permanent doc — no expiry date
    if (files.rcFile?.[0]) {
        const { rcNumber, rcOwnerName } = req.body;

        if (!rcNumber || !rcOwnerName) {
            throw new ApiError(
                400,
                "RC number and owner name are required when uploading RC"
            );
        }
        if (vehicle.rc?.public_id) {
            await deleteFromCloudinary(vehicle.rc.public_id);
        }
        const uploaded = await uploadToCloudinary(files.rcFile[0].path, "rcFile");

        vehicle.rc.number = rcNumber;
        vehicle.rc.ownerName = rcOwnerName;
        vehicle.rc.file.url = uploaded.url;
        vehicle.rc.file.public_id = uploaded.public_id;
        vehicle.rc.status = "pending";
    }

    if (files.insuranceFile?.[0]) {
        const { insuranceProvider, insurancePolicyNumber, insuranceExpiryDate } = req.body;

        if (!insuranceProvider || !insurancePolicyNumber || !insuranceExpiryDate) {
            throw new ApiError(
                400,
                "Insurance provider, policy number and expiry date are required when uploading insurance"
            );
        }

        const expiry = new Date(insuranceExpiryDate);
        if (isNaN(expiry.getTime())) {
            throw new ApiError(400, "Invalid insurance expiry date");
        }
        if (expiry < new Date()) {
            throw new ApiError(400, "Insurance is already expired — upload a valid policy");
        }
        if (vehicle.insurance?.public_id) {
            await deleteFromCloudinary(vehicle.insurance.public_id);
        }

        const uploaded = await uploadToCloudinary(files.insuranceFile[0].path, "insuranceFile");

        vehicle.insurance.provider = insuranceProvider;
        vehicle.insurance.policyNumber = insurancePolicyNumber;
        vehicle.insurance.file.url = uploaded.url;
        vehicle.insurance.file.public_id = uploaded.public_id;
        vehicle.insurance.expiryDate = expiry;
        vehicle.insurance.status = "pending";
    }

    if (files.pucFile?.[0]) {
        const { pucExpiryDate } = req.body;

        if (!pucExpiryDate) { throw new ApiError(400, "PUC expiry date is required when uploading PUC"); }

        const expiry = new Date(pucExpiryDate);

        if (isNaN(expiry.getTime())) { throw new ApiError(400, "Invalid PUC expiry date"); }

        if (expiry < new Date()) { throw new ApiError(400, "PUC is already expired — get it renewed first"); }

        if (vehicle.puc?.public_id) {
            await deleteFromCloudinary(vehicle.puc.public_id);
        }

        const uploaded = await uploadToCloudinary(files.pucFile[0].path, "pucFile");

        vehicle.puc.file.url = uploaded.url;
        vehicle.puc.file.public_id = uploaded.public_id;
        vehicle.puc.expiryDate = expiry;
        vehicle.puc.status = "pending";
    }

    if (files.permitFile?.[0]) {
        const { permitType, permitExpiryDate } = req.body;

        if (!permitType) {
            throw new ApiError(400, "Permit type is required when uploading permit");
        }

        if (vehicle.permit?.public_id) {
            await deleteFromCloudinary(vehicle.permit.public_id);
        }

        const uploaded = await uploadToCloudinary(files.permitFile[0].path, "permitFile");

        vehicle.permit.type = permitType;
        vehicle.permit.file.url = uploaded.url;
        vehicle.permit.file.public_id = uploaded.public_id;
        vehicle.permit.status = "pending";

        if (permitExpiryDate) {
            const expiry = new Date(permitExpiryDate);
            if (isNaN(expiry.getTime())) {
                throw new ApiError(400, "Invalid permit expiry date");
            }
            vehicle.permit.expiryDate = expiry;
        }
    }

    // Re-upload resets vehicleVerified — admin must re-review
    vehicle.vehicleVerified = "pending";
    await vehicle.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedDocuments: Object.keys(files),
                vehicleVerified: vehicle.vehicleVerified,
                rc: vehicle.rc,
                insurance: vehicle.insurance,
                puc: vehicle.puc,
                permit: vehicle.permit,
            },
            "Vehicle document(s) uploaded successfully — pending admin review"
        )
    );
});