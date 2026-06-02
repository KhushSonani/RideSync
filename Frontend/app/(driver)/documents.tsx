import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    RefreshControl,
    Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';

import { getDriverProfile, uploadLicense, uploadVehicleDocs } from "@/services/driver";
import { COLORS } from "@/constants/theme";
import { glassCard, inputField, primaryButton } from "@/constants/styles";
import { pickImageFromGallery } from "@/services/upload";
import VerificationBanner from "@/components/VerificationBanner";

type DocTab = "license" | "rc" | "insurance" | "puc" | "permit";

export default function DocumentUpload() {
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocTab | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs
    const [licenseNo, setLicenseNo] = useState("");
    const [licenseExpiry, setLicenseExpiry] = useState("");
    const [licenseFile, setLicenseFile] = useState<any>(null);

    const [rcNo, setRcNo] = useState("");
    const [rcOwner, setRcOwner] = useState("");
    const [rcFile, setRcFile] = useState<any>(null);

    const [insProvider, setInsProvider] = useState("");
    const [insPolicy, setInsPolicy] = useState("");
    const [insExpiry, setInsExpiry] = useState("");
    const [insFile, setInsFile] = useState<any>(null);

    const [pucExpiry, setPucExpiry] = useState("");
    const [pucFile, setPucFile] = useState<any>(null);

    const [permitType, setPermitType] = useState("");
    const [permitExpiry, setPermitExpiry] = useState("");
    const [permitFile, setPermitFile] = useState<any>(null);

    useEffect(() => {
        loadDriverData();
    }, []);

    const loadDriverData = async () => {
        try {
            setLoading(true);
            const response = await getDriverProfile();
            if (response?.data) {
                const dr = response.data;
                setDriver(dr);
                // Pre-fill existing data
                if (dr.license?.number) setLicenseNo(dr.license.number);
                if (dr.license?.expiryDate) setLicenseExpiry(dr.license.expiryDate.split("T")[0]);
                
                const veh = dr.vehicle;
                if (veh) {
                    if (veh.rc?.number) setRcNo(veh.rc.number);
                    if (veh.rc?.ownerName) setRcOwner(veh.rc.ownerName);
                    
                    if (veh.insurance?.provider) setInsProvider(veh.insurance.provider);
                    if (veh.insurance?.policyNumber) setInsPolicy(veh.insurance.policyNumber);
                    if (veh.insurance?.expiryDate) setInsExpiry(veh.insurance.expiryDate.split("T")[0]);
                    
                    if (veh.puc?.expiryDate) setPucExpiry(veh.puc.expiryDate.split("T")[0]);
                    
                    if (veh.permit?.type) setPermitType(veh.permit.type);
                    if (veh.permit?.expiryDate) setPermitExpiry(veh.permit.expiryDate.split("T")[0]);
                }
            }
        } catch (error) {
            console.log("LOAD DRIVER DOC DATA ERROR:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const response = await getDriverProfile();
            if (response?.data) {
                setDriver(response.data);
            }
        } catch (error) {
            console.log("REFRESH DRIVER DOCS ERROR:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSelectFile = async (type: DocTab) => {
        try {
            const file = await pickImageFromGallery();
            if (!file) return;

            if (type === "license") setLicenseFile(file);
            else if (type === "rc") setRcFile(file);
            else if (type === "insurance") setInsFile(file);
            else if (type === "puc") setPucFile(file);
            else if (type === "permit") setPermitFile(file);
        } catch (err: any) {
            Alert.alert("File Selection Error", err.message);
        }
    };

    const validateDate = (dateStr: string) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d > new Date();
    };

    const handleUploadLicense = async () => {
        if (!licenseNo.trim()) {
            Alert.alert("Error", "Please enter your license number.");
            return;
        }
        const licenseRegex = /^[A-Z]{2}[0-9]{13}$/;
        if (!licenseRegex.test(licenseNo.trim())) {
            Alert.alert("Error", "License number must match standard format (e.g. MH1220130005432).");
            return;
        }
        if (!validateDate(licenseExpiry)) {
            Alert.alert("Error", "Please enter a valid, future expiration date (YYYY-MM-DD).");
            return;
        }
        if (!licenseFile && !driver?.license?.file?.url) {
            Alert.alert("Error", "Please select a license photo/document.");
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append("licenseNumber", licenseNo.trim());
            formData.append("licenseExpiryDate", licenseExpiry);
            if (licenseFile) {
                formData.append("licenseUpload", {
                    uri: licenseFile.uri,
                    name: licenseFile.fileName || "license.jpg",
                    type: licenseFile.mimeType || "image/jpeg"
                } as any);
            }

            await uploadLicense(formData);
            Alert.alert("Success", "License uploaded successfully!");
            setEditingDoc(null);
            loadDriverData();
        } catch (error: any) {
            console.log("UPLOAD LICENSE ERROR:", error?.response?.data || error.message);
            Alert.alert("Error", error?.response?.data?.message || "Failed to upload license.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadVehicleDocs = async (docType: "rc" | "insurance" | "puc" | "permit") => {
        const formData = new FormData();

        if (docType === "rc") {
            if (!rcNo.trim() || !rcOwner.trim()) {
                Alert.alert("Error", "Please fill in RC number and owner name.");
                return;
            }
            if (!rcFile && !driver?.vehicle?.rc?.file?.url) {
                Alert.alert("Error", "Please select RC document photo.");
                return;
            }
            formData.append("rcNumber", rcNo.trim());
            formData.append("rcOwnerName", rcOwner.trim());
            if (rcFile) {
                formData.append("rcFile", {
                    uri: rcFile.uri,
                    name: rcFile.fileName || "rc.jpg",
                    type: rcFile.mimeType || "image/jpeg"
                } as any);
            }
        } else if (docType === "insurance") {
            if (!insProvider.trim() || !insPolicy.trim()) {
                Alert.alert("Error", "Please fill in policy details.");
                return;
            }
            if (!validateDate(insExpiry)) {
                Alert.alert("Error", "Please enter a valid, future expiration date (YYYY-MM-DD).");
                return;
            }
            if (!insFile && !driver?.vehicle?.insurance?.file?.url) {
                Alert.alert("Error", "Please select insurance document photo.");
                return;
            }
            formData.append("insuranceProvider", insProvider.trim());
            formData.append("insurancePolicyNumber", insPolicy.trim());
            formData.append("insuranceExpiryDate", insExpiry);
            if (insFile) {
                formData.append("insuranceFile", {
                    uri: insFile.uri,
                    name: insFile.fileName || "insurance.jpg",
                    type: insFile.mimeType || "image/jpeg"
                } as any);
            }
        } else if (docType === "puc") {
            if (!validateDate(pucExpiry)) {
                Alert.alert("Error", "Please enter a valid, future expiration date (YYYY-MM-DD).");
                return;
            }
            if (!pucFile && !driver?.vehicle?.puc?.file?.url) {
                Alert.alert("Error", "Please select PUC document photo.");
                return;
            }
            formData.append("pucExpiryDate", pucExpiry);
            if (pucFile) {
                formData.append("pucFile", {
                    uri: pucFile.uri,
                    name: pucFile.fileName || "puc.jpg",
                    type: pucFile.mimeType || "image/jpeg"
                } as any);
            }
        } else if (docType === "permit") {
            if (!permitType.trim()) {
                Alert.alert("Error", "Please enter permit type.");
                return;
            }
            if (permitExpiry && !validateDate(permitExpiry)) {
                Alert.alert("Error", "If providing an expiry date, it must be in the future (YYYY-MM-DD).");
                return;
            }
            if (!permitFile && !driver?.vehicle?.permit?.file?.url) {
                Alert.alert("Error", "Please select permit document photo.");
                return;
            }
            formData.append("permitType", permitType.trim());
            if (permitExpiry) formData.append("permitExpiryDate", permitExpiry);
            if (permitFile) {
                formData.append("permitFile", {
                    uri: permitFile.uri,
                    name: permitFile.fileName || "permit.jpg",
                    type: permitFile.mimeType || "image/jpeg"
                } as any);
            }
        }

        try {
            setSubmitting(true);
            await uploadVehicleDocs(formData);
            Alert.alert("Success", `${docType.toUpperCase()} document uploaded successfully!`);
            setEditingDoc(null);
            loadDriverData();
        } catch (error: any) {
            console.log(`UPLOAD ${docType.toUpperCase()} ERROR:`, error?.response?.data || error.message);
            Alert.alert("Error", error?.response?.data?.message || `Failed to upload ${docType.toUpperCase()} document.`);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusText = (status: string) => {
        if (!status) return "Missing";
        return status.replace("_", " ");
    };

    const getStatusColor = (status: string) => {
        if (!status) return "text-red-500 bg-red-500/10 border-red-500/20";
        if (status === "verified") return "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20";
        if (status === "pending") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
        if (status === "under_review") return "text-blue-400 bg-blue-400/10 border-blue-400/20";
        return "text-red-500 bg-red-500/10 border-red-500/20";
    };

    const formatDateStr = (dateStr: string) => {
        if (!dateStr) return "Not Provided";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return "N/A";
        }
    };

    const hasUploadedLicense = !!driver?.license?.file?.url;
    const hasUploadedRc = !!driver?.vehicle?.rc?.file?.url;
    const hasUploadedIns = !!driver?.vehicle?.insurance?.file?.url;
    const hasUploadedPuc = !!driver?.vehicle?.puc?.file?.url;
    const hasUploadedPermit = !!driver?.vehicle?.permit?.file?.url;

    const renderLicenseForm = () => {
        return (
            <View className="gap-y-4">
                <View className={inputField}>
                    <Feather name="hash" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="License Number (e.g. MH1220130005432)"
                        placeholderTextColor="#667085"
                        value={licenseNo}
                        onChangeText={setLicenseNo}
                        autoCapitalize="characters"
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <View className={inputField}>
                    <Feather name="calendar" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Expiry Date (YYYY-MM-DD)"
                        placeholderTextColor="#667085"
                        value={licenseExpiry}
                        onChangeText={setLicenseExpiry}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectFile("license")}
                    className="border border-dashed border-white/20 rounded-xl h-24 items-center justify-center bg-white/[0.01]"
                >
                    {licenseFile || driver?.license?.file?.url ? (
                        <View className="flex-row items-center">
                            <Feather name="file-text" size={20} color="#11E0C5" />
                            <Text className="text-white text-xs font-semibold ml-2">
                                {licenseFile ? "New file selected" : "File uploaded (Review)"}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Feather name="upload-cloud" size={22} color="#748096" />
                            <Text className="text-[#748096] text-xs mt-1">Select Photo/Document</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleUploadLicense}
                    disabled={submitting}
                    className={`${primaryButton} mt-3`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#071018" />
                    ) : (
                        <Text className="text-[#071018] text-sm font-bold">Upload Driver License</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setEditingDoc(null)}
                    className="w-full h-11 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-row items-center justify-center mt-2"
                >
                    <Text className="text-white/60 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderRcForm = () => {
        return (
            <View className="gap-y-4">
                <View className={inputField}>
                    <Feather name="hash" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="RC Registration Number"
                        placeholderTextColor="#667085"
                        value={rcNo}
                        onChangeText={setRcNo}
                        autoCapitalize="characters"
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <View className={inputField}>
                    <Feather name="user" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Owner Full Name (on RC)"
                        placeholderTextColor="#667085"
                        value={rcOwner}
                        onChangeText={setRcOwner}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectFile("rc")}
                    className="border border-dashed border-white/20 rounded-xl h-24 items-center justify-center bg-white/[0.01]"
                >
                    {rcFile || driver?.vehicle?.rc?.file?.url ? (
                        <View className="flex-row items-center">
                            <Feather name="file-text" size={20} color="#11E0C5" />
                            <Text className="text-white text-xs font-semibold ml-2">
                                {rcFile ? "New file selected" : "File uploaded (Review)"}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Feather name="upload-cloud" size={22} color="#748096" />
                            <Text className="text-[#748096] text-xs mt-1">Select Photo/Document</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUploadVehicleDocs("rc")}
                    disabled={submitting}
                    className={`${primaryButton} mt-3`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#071018" />
                    ) : (
                        <Text className="text-[#071018] text-sm font-bold">Upload RC</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setEditingDoc(null)}
                    className="w-full h-11 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-row items-center justify-center mt-2"
                >
                    <Text className="text-white/60 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderInsuranceForm = () => {
        return (
            <View className="gap-y-4">
                <View className={inputField}>
                    <Feather name="briefcase" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Insurance Provider Company"
                        placeholderTextColor="#667085"
                        value={insProvider}
                        onChangeText={setInsProvider}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <View className={inputField}>
                    <Feather name="hash" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Policy Number"
                        placeholderTextColor="#667085"
                        value={insPolicy}
                        onChangeText={setInsPolicy}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <View className={inputField}>
                    <Feather name="calendar" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Expiry Date (YYYY-MM-DD)"
                        placeholderTextColor="#667085"
                        value={insExpiry}
                        onChangeText={setInsExpiry}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectFile("insurance")}
                    className="border border-dashed border-white/20 rounded-xl h-24 items-center justify-center bg-white/[0.01]"
                >
                    {insFile || driver?.vehicle?.insurance?.file?.url ? (
                        <View className="flex-row items-center">
                            <Feather name="file-text" size={20} color="#11E0C5" />
                            <Text className="text-white text-xs font-semibold ml-2">
                                {insFile ? "New file selected" : "File uploaded (Review)"}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Feather name="upload-cloud" size={22} color="#748096" />
                            <Text className="text-[#748096] text-xs mt-1">Select Photo/Document</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUploadVehicleDocs("insurance")}
                    disabled={submitting}
                    className={`${primaryButton} mt-3`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#071018" />
                    ) : (
                        <Text className="text-[#071018] text-sm font-bold">Upload Insurance</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setEditingDoc(null)}
                    className="w-full h-11 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-row items-center justify-center mt-2"
                >
                    <Text className="text-white/60 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPucForm = () => {
        return (
            <View className="gap-y-4">
                <View className={inputField}>
                    <Feather name="calendar" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="PUC Expiry Date (YYYY-MM-DD)"
                        placeholderTextColor="#667085"
                        value={pucExpiry}
                        onChangeText={setPucExpiry}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectFile("puc")}
                    className="border border-dashed border-white/20 rounded-xl h-24 items-center justify-center bg-white/[0.01]"
                >
                    {pucFile || driver?.vehicle?.puc?.file?.url ? (
                        <View className="flex-row items-center">
                            <Feather name="file-text" size={20} color="#11E0C5" />
                            <Text className="text-white text-xs font-semibold ml-2">
                                {pucFile ? "New file selected" : "File uploaded (Review)"}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Feather name="upload-cloud" size={22} color="#748096" />
                            <Text className="text-[#748096] text-xs mt-1">Select Photo/Document</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUploadVehicleDocs("puc")}
                    disabled={submitting}
                    className={`${primaryButton} mt-3`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#071018" />
                    ) : (
                        <Text className="text-[#071018] text-sm font-bold">Upload PUC</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setEditingDoc(null)}
                    className="w-full h-11 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-row items-center justify-center mt-2"
                >
                    <Text className="text-white/60 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPermitForm = () => {
        return (
            <View className="gap-y-4">
                <View className={inputField}>
                    <Feather name="shield" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Permit Type (e.g. National Permit)"
                        placeholderTextColor="#667085"
                        value={permitType}
                        onChangeText={setPermitType}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <View className={inputField}>
                    <Feather name="calendar" size={16} color="#667085" className="mr-3" />
                    <TextInput
                        placeholder="Expiry Date (YYYY-MM-DD, Optional)"
                        placeholderTextColor="#667085"
                        value={permitExpiry}
                        onChangeText={setPermitExpiry}
                        className="flex-1 text-white text-[15px]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectFile("permit")}
                    className="border border-dashed border-white/20 rounded-xl h-24 items-center justify-center bg-white/[0.01]"
                >
                    {permitFile || driver?.vehicle?.permit?.file?.url ? (
                        <View className="flex-row items-center">
                            <Feather name="file-text" size={20} color="#11E0C5" />
                            <Text className="text-white text-xs font-semibold ml-2">
                                {permitFile ? "New file selected" : "File uploaded (Review)"}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center">
                            <Feather name="upload-cloud" size={22} color="#748096" />
                            <Text className="text-[#748096] text-xs mt-1">Select Photo/Document</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUploadVehicleDocs("permit")}
                    disabled={submitting}
                    className={`${primaryButton} mt-3`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#071018" />
                    ) : (
                        <Text className="text-[#071018] text-sm font-bold">Upload Permit</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setEditingDoc(null)}
                    className="w-full h-11 bg-white/[0.05] border border-white/[0.08] rounded-xl flex-row items-center justify-center mt-2"
                >
                    <Text className="text-white/60 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#070B12] items-center justify-center">
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <ActivityIndicator size="large" color="#11E0C5" />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <SafeAreaView className="flex-1 px-5 pt-3">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#11E0C5"
                            colors={["#11E0C5"]}
                        />
                    }
                >
                    {/* TITLE */}
                    <View className="mt-3 mb-4">
                        <Text className="text-white text-[28px] font-bold tracking-tight">
                            Documents
                        </Text>
                        <Text className="text-[#748096] text-[13px] mt-1 leading-5">
                            Upload required identification and vehicle documentation for verification.
                        </Text>
                    </View>

                    {/* DYNAMIC BANNER */}
                    {driver?.driverVerified !== "verified" && (
                        <VerificationBanner
                            driverVerified={driver?.driverVerified}
                            verificationNote={driver?.verificationNote}
                            onActionPress={() => {}}
                        />
                    )}

                    {/* ALL DOCUMENT CARDS STACKED VERTICALLY */}
                    <View className="gap-y-4 mt-2">
                        {/* Driver License Card */}
                        <View className={`${glassCard} p-5 border border-white/[0.08]`}>
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white text-base font-bold">Driver License</Text>
                                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${getStatusColor(driver?.license?.status)}`}>
                                    <Text className="text-[10px] font-bold capitalize text-current">
                                        {getStatusText(driver?.license?.status)}
                                    </Text>
                                </View>
                            </View>

                            {hasUploadedLicense ? (
                                <View className="bg-[#131D2B]/40 rounded-xl p-3.5 border border-white/[0.03] gap-y-1 mb-3">
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">License Number</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.license.number}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Expiry Date</Text>
                                        <Text className="text-white text-sm font-semibold">{formatDateStr(driver.license.expiryDate)}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 items-center">
                                        <Text className="text-[#748096] text-xs">Document Attachment</Text>
                                        <View className="flex-row items-center">
                                            <Feather name="check-circle" size={13} color="#11E0C5" className="mr-1" />
                                            <Text className="text-[#11E0C5] text-xs font-semibold">Uploaded</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-[#748096] text-xs mb-3 leading-5">
                                    No driver license uploaded yet. Please upload your license to get verified.
                                </Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (driver?.license?.number) setLicenseNo(driver.license.number);
                                    if (driver?.license?.expiryDate) setLicenseExpiry(driver.license.expiryDate.split("T")[0]);
                                    setLicenseFile(null);
                                    setEditingDoc("license");
                                }}
                                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-row items-center justify-center gap-x-2"
                            >
                                <Feather name={hasUploadedLicense ? "edit-2" : "upload-cloud"} size={14} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-xs font-bold">
                                    {hasUploadedLicense ? "Edit / Re-upload" : "Upload Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Registration Certificate (RC) Card */}
                        <View className={`${glassCard} p-5 border border-white/[0.08]`}>
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white text-base font-bold">Registration Certificate (RC)</Text>
                                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${getStatusColor(driver?.vehicle?.rc?.status)}`}>
                                    <Text className="text-[10px] font-bold capitalize text-current">
                                        {getStatusText(driver?.vehicle?.rc?.status)}
                                    </Text>
                                </View>
                            </View>

                            {hasUploadedRc ? (
                                <View className="bg-[#131D2B]/40 rounded-xl p-3.5 border border-white/[0.03] gap-y-1 mb-3">
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">RC Number</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.vehicle.rc.number}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Owner Name</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.vehicle.rc.ownerName}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 items-center">
                                        <Text className="text-[#748096] text-xs">Document Attachment</Text>
                                        <View className="flex-row items-center">
                                            <Feather name="check-circle" size={13} color="#11E0C5" className="mr-1" />
                                            <Text className="text-[#11E0C5] text-xs font-semibold">Uploaded</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-[#748096] text-xs mb-3 leading-5">
                                    No registration certificate uploaded yet. Please upload your vehicle RC to get verified.
                                </Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (driver?.vehicle?.rc?.number) setRcNo(driver.vehicle.rc.number);
                                    if (driver?.vehicle?.rc?.ownerName) setRcOwner(driver.vehicle.rc.ownerName);
                                    setRcFile(null);
                                    setEditingDoc("rc");
                                }}
                                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-row items-center justify-center gap-x-2"
                            >
                                <Feather name={hasUploadedRc ? "edit-2" : "upload-cloud"} size={14} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-xs font-bold">
                                    {hasUploadedRc ? "Edit / Re-upload" : "Upload Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Vehicle Insurance Card */}
                        <View className={`${glassCard} p-5 border border-white/[0.08]`}>
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white text-base font-bold">Vehicle Insurance</Text>
                                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${getStatusColor(driver?.vehicle?.insurance?.status)}`}>
                                    <Text className="text-[10px] font-bold capitalize text-current">
                                        {getStatusText(driver?.vehicle?.insurance?.status)}
                                    </Text>
                                </View>
                            </View>

                            {hasUploadedIns ? (
                                <View className="bg-[#131D2B]/40 rounded-xl p-3.5 border border-white/[0.03] gap-y-1 mb-3">
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Provider Company</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.vehicle.insurance.provider}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Policy Number</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.vehicle.insurance.policyNumber}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Expiry Date</Text>
                                        <Text className="text-white text-sm font-semibold">{formatDateStr(driver.vehicle.insurance.expiryDate)}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 items-center">
                                        <Text className="text-[#748096] text-xs">Document Attachment</Text>
                                        <View className="flex-row items-center">
                                            <Feather name="check-circle" size={13} color="#11E0C5" className="mr-1" />
                                            <Text className="text-[#11E0C5] text-xs font-semibold">Uploaded</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-[#748096] text-xs mb-3 leading-5">
                                    No vehicle insurance uploaded yet. Please upload insurance documents to get verified.
                                </Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (driver?.vehicle?.insurance?.provider) setInsProvider(driver.vehicle.insurance.provider);
                                    if (driver?.vehicle?.insurance?.policyNumber) setInsPolicy(driver.vehicle.insurance.policyNumber);
                                    if (driver?.vehicle?.insurance?.expiryDate) setInsExpiry(driver.vehicle.insurance.expiryDate.split("T")[0]);
                                    setInsFile(null);
                                    setEditingDoc("insurance");
                                }}
                                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-row items-center justify-center gap-x-2"
                            >
                                <Feather name={hasUploadedIns ? "edit-2" : "upload-cloud"} size={14} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-xs font-bold">
                                    {hasUploadedIns ? "Edit / Re-upload" : "Upload Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* PUC Certificate Card */}
                        <View className={`${glassCard} p-5 border border-white/[0.08]`}>
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white text-base font-bold">PUC Certificate</Text>
                                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${getStatusColor(driver?.vehicle?.puc?.status)}`}>
                                    <Text className="text-[10px] font-bold capitalize text-current">
                                        {getStatusText(driver?.vehicle?.puc?.status)}
                                    </Text>
                                </View>
                            </View>

                            {hasUploadedPuc ? (
                                <View className="bg-[#131D2B]/40 rounded-xl p-3.5 border border-white/[0.03] gap-y-1 mb-3">
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Expiry Date</Text>
                                        <Text className="text-white text-sm font-semibold">{formatDateStr(driver.vehicle.puc.expiryDate)}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 items-center">
                                        <Text className="text-[#748096] text-xs">Document Attachment</Text>
                                        <View className="flex-row items-center">
                                            <Feather name="check-circle" size={13} color="#11E0C5" className="mr-1" />
                                            <Text className="text-[#11E0C5] text-xs font-semibold">Uploaded</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-[#748096] text-xs mb-3 leading-5">
                                    No PUC certificate uploaded yet. Please upload your PUC to get verified.
                                </Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (driver?.vehicle?.puc?.expiryDate) setPucExpiry(driver.vehicle.puc.expiryDate.split("T")[0]);
                                    setPucFile(null);
                                    setEditingDoc("puc");
                                }}
                                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-row items-center justify-center gap-x-2"
                            >
                                <Feather name={hasUploadedPuc ? "edit-2" : "upload-cloud"} size={14} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-xs font-bold">
                                    {hasUploadedPuc ? "Edit / Re-upload" : "Upload Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Commercial Permit Card */}
                        <View className={`${glassCard} p-5 border border-white/[0.08]`}>
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white text-base font-bold">Commercial Permit</Text>
                                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${getStatusColor(driver?.vehicle?.permit?.status)}`}>
                                    <Text className="text-[10px] font-bold capitalize text-current">
                                        {getStatusText(driver?.vehicle?.permit?.status)}
                                    </Text>
                                </View>
                            </View>

                            {hasUploadedPermit ? (
                                <View className="bg-[#131D2B]/40 rounded-xl p-3.5 border border-white/[0.03] gap-y-1 mb-3">
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Permit Type</Text>
                                        <Text className="text-white text-sm font-semibold">{driver.vehicle.permit.type}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-white/[0.04]">
                                        <Text className="text-[#748096] text-xs">Expiry Date</Text>
                                        <Text className="text-white text-sm font-semibold">
                                            {driver.vehicle.permit.expiryDate ? formatDateStr(driver.vehicle.permit.expiryDate) : "No Expiry Date"}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 items-center">
                                        <Text className="text-[#748096] text-xs">Document Attachment</Text>
                                        <View className="flex-row items-center">
                                            <Feather name="check-circle" size={13} color="#11E0C5" className="mr-1" />
                                            <Text className="text-[#11E0C5] text-xs font-semibold">Uploaded</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-[#748096] text-xs mb-3 leading-5">
                                    No commercial permit uploaded yet. Please upload your permit to get verified.
                                </Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (driver?.vehicle?.permit?.type) setPermitType(driver.vehicle.permit.type);
                                    if (driver?.vehicle?.permit?.expiryDate) setPermitExpiry(driver.vehicle.permit.expiryDate.split("T")[0]);
                                    setPermitFile(null);
                                    setEditingDoc("permit");
                                }}
                                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-row items-center justify-center gap-x-2"
                            >
                                <Feather name={hasUploadedPermit ? "edit-2" : "upload-cloud"} size={14} color="#11E0C5" />
                                <Text className="text-[#11E0C5] text-xs font-bold">
                                    {hasUploadedPermit ? "Edit / Re-upload" : "Upload Document"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Modal for editing/uploading a document */}
            <Modal
                visible={editingDoc !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditingDoc(null)}
            >
                <View className="flex-1 justify-end bg-black/75">
                    <View className="bg-[#070B12] rounded-t-[32px] border-t border-white/[0.08] max-h-[85%] min-h-[50%] p-6">
                        {/* Header of Modal */}
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-white text-lg font-bold">
                                    {editingDoc === "license" && "Upload Driver License"}
                                    {editingDoc === "rc" && "Upload Vehicle RC"}
                                    {editingDoc === "insurance" && "Upload Vehicle Insurance"}
                                    {editingDoc === "puc" && "Upload PUC Certificate"}
                                    {editingDoc === "permit" && "Upload Commercial Permit"}
                                </Text>
                                <Text className="text-[#748096] text-xs mt-1">
                                    Fill in details and upload document photo
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setEditingDoc(null)}
                                className="h-8 w-8 rounded-full bg-white/[0.05] items-center justify-center border border-white/[0.05]"
                            >
                                <Feather name="x" size={18} color="#748096" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 30 }}
                        >
                            {editingDoc === "license" && renderLicenseForm()}
                            {editingDoc === "rc" && renderRcForm()}
                            {editingDoc === "insurance" && renderInsuranceForm()}
                            {editingDoc === "puc" && renderPucForm()}
                            {editingDoc === "permit" && renderPermitForm()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
