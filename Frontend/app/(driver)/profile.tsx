import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StatusBar,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    TextInput,
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from '@expo/vector-icons';

import { api } from "@/services/api";
import { getDriverProfile } from "@/services/driver";
import { clearTokens } from "@/services/storage";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import {
    pickImageFromGallery,
    createImageFormData
} from '@/services/upload';

export default function DriverProfile() {
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutSuccess, setLogoutSuccess] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [changePasswordError, setChangePasswordError] = useState('');
    const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
    const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmNewPasswordVisible, setIsConfirmNewPasswordVisible] = useState(false);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await getDriverProfile();
            if (response?.data) {
                setDriver(response.data);
            }
        } catch (error) {
            console.log("DRIVER PROFILE FETCH ERROR:", error);
            // Mock fallback values for visual testing
            setDriver({
                user: {
                    fullname: "Khush Sonani",
                    username: "khush_sonani",
                    email: "driver@ridesync.com",
                    role: "driver",
                    avatar: null,
                    createdAt: new Date().toISOString()
                },
                driverVerified: "pending",
                isActive: false,
                vehicle: {
                    make: "Toyota",
                    model: "Innova Crysta",
                    color: "Silver",
                    plate: "MH12AB1234",
                    vehicleType: "car",
                    capacity: 6
                }
            });
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
            console.log("DRIVER PROFILE REFRESH ERROR:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const clearPasswordState = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setChangePasswordError('');
        setChangePasswordSuccess('');
        setIsOldPasswordVisible(false);
        setIsNewPasswordVisible(false);
        setIsConfirmNewPasswordVisible(false);
    };

    const handleChangePassword = async () => {
        setChangePasswordError('');
        setChangePasswordSuccess('');

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            setChangePasswordError("Please fill in all password fields.");
            return;
        }
        if (newPassword.length < 6) {
            setChangePasswordError("New password must be at least 6 characters.");
            return;
        }
        if (oldPassword === newPassword) {
            setChangePasswordError("New password must be different from current password.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError("New passwords do not match.");
            return;
        }

        try {
            setChangingPassword(true);
            const response = await api.post('/users/change-password', {
                oldPassword,
                newPassword
            });
            setChangePasswordSuccess(response.data?.message || "Password changed successfully!");
            setTimeout(() => {
                setShowChangePasswordModal(false);
                clearPasswordState();
            }, 1500);
        } catch (error: any) {
            console.log("CHANGE PASSWORD ERROR:", error?.response?.data || error.message);
            const message = error?.response?.data?.message || "Failed to change password. Please check your credentials.";
            setChangePasswordError(message);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleAvatarUpload = async () => {
        try {
            const image = await pickImageFromGallery();
            if (!image) return;
            setUploadingAvatar(true);
            const formData = await createImageFormData(image, "avatar");
            const response = await api.patch(
                "/users/avatar",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    }
                }
            );
            if (response.data?.data) {
                setDriver((prev: any) => ({
                    ...prev,
                    user: response.data.data
                }));
            }
            Alert.alert("Success", "Avatar uploaded successfully!");
        } catch (err: any) {
            console.log("Avatar Upload Error:", err?.response?.data || err.message);
            Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to upload image");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarDelete = async () => {
        try {
            setUploadingAvatar(true);
            const response = await api.delete("/users/avatar");
            if (response.data?.data) {
                setDriver((prev: any) => ({
                    ...prev,
                    user: response.data.data
                }));
            }
            Alert.alert("Success", "Avatar deleted successfully!");
        } catch (err: any) {
            console.log("Avatar Delete Error:", err?.response?.data || err.message);
            Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to delete image");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarPress = () => {
        const buttons: any[] = [
            { text: "Upload Photo", onPress: handleAvatarUpload },
        ];
        if (driver?.user?.avatar?.url) {
            buttons.push({
                text: "Delete Photo",
                style: "destructive",
                onPress: handleAvatarDelete
            });
        }
        buttons.push({ text: "Cancel", style: "cancel" });

        Alert.alert(
            "Profile Photo",
            "Choose an action",
            buttons
        );
    };

    const confirmLogout = async () => {
        setLogoutError('');
        setLogoutSuccess(false);
        try {
            setLoggingOut(true);
            try {
                await api.post('/users/logout');
            } catch {
                console.log("Backend logout request failed/ignored");
            }
            await clearTokens();
            setLogoutSuccess(true);
            setTimeout(() => {
                setShowLogoutModal(false);
                router.replace("/");
            }, 1500);
        } catch (err) {
            console.log("LOGOUT ERROR:", err);
            setLogoutError("Something went wrong during logout.");
        } finally {
            setLoggingOut(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "DR";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
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

    const user = driver?.user;
    const vehicle = driver?.vehicle;

    const getVerificationBadge = () => {
        let status = driver?.driverVerified;
        
        // If any document is rejected, override status to rejected
        const hasAnyDocRejected = 
            driver?.license?.status === "rejected" ||
            driver?.vehicle?.rc?.status === "rejected" ||
            driver?.vehicle?.insurance?.status === "rejected" ||
            driver?.vehicle?.puc?.status === "rejected" ||
            driver?.vehicle?.permit?.status === "rejected";
            
        if (hasAnyDocRejected) {
            status = "rejected";
        }

        let bgClass = "bg-[#11E0C5]/10 border border-[#11E0C5]/20";
        let textClass = "text-[#11E0C5]";
        let label = "Status: Pending";
        let iconName: any = "navigation";

        if (status === "verified") {
            bgClass = "bg-[#10B981]/10 border border-[#10B981]/20";
            textClass = "text-[#10B981]";
            label = "Verified Driver";
            iconName = "check-circle";
        } else if (status === "rejected") {
            bgClass = "bg-red-500/10 border border-red-500/20";
            textClass = "text-red-500";
            label = "Verification Rejected";
            iconName = "x-circle";
        } else if (status === "under_review") {
            bgClass = "bg-blue-500/10 border border-blue-500/20";
            textClass = "text-blue-500";
            label = "Under Review";
            iconName = "clock";
        } else if (status === "pending") {
            bgClass = "bg-amber-500/10 border border-amber-500/20";
            textClass = "text-amber-500";
            label = "Verification Pending";
            iconName = "alert-circle";
        }

        return (
            <View className={`${bgClass} px-4 py-1.5 rounded-full mt-3 flex-row items-center`}>
                <Feather name={iconName} size={12} color={status === "verified" ? "#10B981" : status === "rejected" ? "#EF4444" : status === "under_review" ? "#3B82F6" : status === "pending" ? "#F59E0B" : "#11E0C5"} className="mr-1.5" />
                <Text className={`${textClass} text-[11px] font-bold uppercase tracking-wider`}>
                    {label}
                </Text>
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

            {/* PREMIUM GLOW BACKGROUND */}
            <View className="absolute inset-0 overflow-hidden">
                <View
                    className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />
                <View
                    className="absolute top-[320px] -left-20 w-[240px] h-[240px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
                />
                <View className="absolute bottom-[-100px] -left-20 w-[300px] h-[300px] rounded-full bg-[#11E0C5]/5" />
                <View
                    className="absolute top-[-20px] right-[-40px] w-[260px] h-[260px] rounded-full items-center justify-center"
                    style={{ backgroundColor: COLORS.glowRing }}
                >
                    <View className="w-[190px] h-[190px] rounded-full bg-[#1D6B61]/15" />
                </View>
            </View>

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
                    <View className="mt-3 mb-6">
                        <Text className="text-white text-[28px] font-bold tracking-tight">
                            Driver Profile
                        </Text>
                    </View>

                    {/* AVATAR AND HEADER */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            <View className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#11E0C5] to-[#0A84FF] border border-[#11E0C5]/30 items-center justify-center shadow-2xl">
                                {user?.avatar?.url ? (
                                    <Image
                                        source={{ uri: user.avatar.url }}
                                        className="w-full h-full rounded-full"
                                    />
                                ) : (
                                    <View className="w-full h-full rounded-full bg-[#131D2B] items-center justify-center">
                                        <Text className="text-[#11E0C5] text-[36px] font-bold tracking-wide">
                                            {getInitials(user?.fullname)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#11E0C5] border-2 border-[#070B12] items-center justify-center shadow-lg"
                                onPress={handleAvatarPress}
                            >
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Feather name="camera" size={14} color="#071018" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text className="text-white text-[24px] font-bold tracking-tight mt-4">
                            {user?.fullname || "Driver Account"}
                        </Text>
                        <Text className="text-[#748096] text-[13px] mt-1 font-medium">
                            @{user?.username || "driver"}
                        </Text>

                        {/* STATUS BADGE */}
                        {getVerificationBadge()}
                    </View>

                    {/* VEHICLE DETAILS */}
                    <Text className="text-white text-[16px] font-bold mb-3 px-1">
                        Vehicle Information
                    </Text>
                    <View className={`${glassCard} p-5 shadow-xl mb-6`}>
                        {vehicle ? (
                            <View className="gap-y-3">
                                <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                                    <Text className="text-[#748096] text-xs">Model</Text>
                                    <Text className="text-white text-sm font-semibold">{vehicle.make} {vehicle.model}</Text>
                                </View>
                                <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                                    <Text className="text-[#748096] text-xs">Color / Type</Text>
                                    <Text className="text-white text-sm font-semibold capitalize">{vehicle.color} ({vehicle.vehicleType})</Text>
                                </View>
                                <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                                    <Text className="text-[#748096] text-xs">License Plate</Text>
                                    <Text className="text-white text-sm font-semibold">{vehicle.plate}</Text>
                                </View>
                                <View className="flex-row items-center justify-between px-1">
                                    <Text className="text-[#748096] text-xs">Passenger Capacity</Text>
                                    <Text className="text-white text-sm font-semibold">{vehicle.capacity} Seats</Text>
                                </View>
                            </View>
                        ) : (
                            <Text className="text-[#748096] text-sm text-center py-2">No vehicle linked to profile.</Text>
                        )}
                    </View>

                    {/* DOCUMENT EXPIRATIONS */}
                    <Text className="text-white text-[16px] font-bold mb-3 px-1">
                        Document Expiry Dates
                    </Text>
                    <View className={`${glassCard} p-5 shadow-xl mb-6 gap-y-3`}>
                        <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                            <Text className="text-[#748096] text-xs">Driver License</Text>
                            <Text className="text-white text-sm font-semibold">{formatDateStr(driver?.license?.expiryDate)}</Text>
                        </View>
                        <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                            <Text className="text-[#748096] text-xs">Insurance Policy</Text>
                            <Text className="text-white text-sm font-semibold">{formatDateStr(vehicle?.insurance?.expiryDate)}</Text>
                        </View>
                        <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-2 px-1">
                            <Text className="text-[#748096] text-xs">PUC Expiration</Text>
                            <Text className="text-white text-sm font-semibold">{formatDateStr(vehicle?.puc?.expiryDate)}</Text>
                        </View>
                        <View className="flex-row items-center justify-between px-1">
                            <Text className="text-[#748096] text-xs">Commercial Permit</Text>
                            <Text className="text-white text-sm font-semibold">{formatDateStr(vehicle?.permit?.expiryDate)}</Text>
                        </View>
                    </View>

                    {/* SETTINGS MENU */}
                    <Text className="text-white text-[16px] font-bold mb-3 px-1">
                        Security Settings
                    </Text>
                    <View className={`${glassCard} p-3 shadow-xl mb-6`}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setShowChangePasswordModal(true)}
                            className="flex-row items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.02]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-[#11E0C5]/10 items-center justify-center mr-3">
                                    <Feather name="lock" size={15} color="#11E0C5" />
                                </View>
                                <Text className="text-white text-sm font-medium">Change Password</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>
                    </View>

                    {/* SIGN OUT */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            setLogoutError('');
                            setLogoutSuccess(false);
                            setShowLogoutModal(true);
                        }}
                        className="w-full h-14 bg-[#131D2B]/95 border border-red-500/20 rounded-2xl flex-row items-center justify-center mt-3"
                    >
                        <Feather name="log-out" size={16} color="#EF4444" className="mr-2" />
                        <Text className="text-[#EF4444] text-[16px] font-bold">
                            Sign Out
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>

            {/* CHANGE PASSWORD MODAL */}
            <Modal
                visible={showChangePasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setShowChangePasswordModal(false);
                    clearPasswordState();
                }}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View
                        className={`${glassCard} w-full p-6 border border-white/[0.08]`}
                        style={{
                            backgroundColor: "#0D1420",
                            shadowColor: "#11E0C5",
                            shadowOpacity: 0.1,
                            shadowRadius: 25,
                            elevation: 15,
                        }}
                    >
                        <Text className="text-white text-xl font-bold tracking-tight mb-2">
                            Change Password
                        </Text>
                        <Text className="text-[#748096] text-xs mb-5">
                            Update your credentials securely
                        </Text>

                        {/* OLD PASSWORD */}
                        <View className="h-12 bg-[#131D2B]/95 border border-white/[0.06] rounded-xl px-4 flex-row items-center mb-3">
                            <Feather name="lock" size={14} color="#667085" />
                            <TextInput
                                placeholder="Current Password"
                                placeholderTextColor="#667085"
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                secureTextEntry={!isOldPasswordVisible}
                                autoCapitalize="none"
                                className="flex-1 text-white text-[14px] ml-3"
                            />
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setIsOldPasswordVisible(!isOldPasswordVisible)}
                            >
                                <Feather
                                    name={isOldPasswordVisible ? "eye" : "eye-off"}
                                    size={15}
                                    color="#667085"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* NEW PASSWORD */}
                        <View className="h-12 bg-[#131D2B]/95 border border-white/[0.06] rounded-xl px-4 flex-row items-center mb-3">
                            <Feather name="shield" size={14} color="#667085" />
                            <TextInput
                                placeholder="New Password (min 6 chars)"
                                placeholderTextColor="#667085"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!isNewPasswordVisible}
                                autoCapitalize="none"
                                className="flex-1 text-white text-[14px] ml-3"
                            />
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                            >
                                <Feather
                                    name={isNewPasswordVisible ? "eye" : "eye-off"}
                                    size={15}
                                    color="#667085"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* CONFIRM NEW PASSWORD */}
                        <View className="h-12 bg-[#131D2B]/95 border border-white/[0.06] rounded-xl px-4 flex-row items-center mb-4">
                            <Feather name="shield" size={14} color="#667085" />
                            <TextInput
                                placeholder="Confirm New Password"
                                placeholderTextColor="#667085"
                                value={confirmNewPassword}
                                onChangeText={setConfirmNewPassword}
                                secureTextEntry={!isConfirmNewPasswordVisible}
                                autoCapitalize="none"
                                className="flex-1 text-white text-[14px] ml-3"
                            />
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setIsConfirmNewPasswordVisible(!isConfirmNewPasswordVisible)}
                            >
                                <Feather
                                    name={isConfirmNewPasswordVisible ? "eye" : "eye-off"}
                                    size={15}
                                    color="#667085"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* ERROR & SUCCESS */}
                        {changePasswordError ? (
                            <Text className="text-red-500 text-xs font-semibold text-center mb-3">
                                {changePasswordError}
                            </Text>
                        ) : null}
                        {changePasswordSuccess ? (
                            <Text className="text-green-400 text-xs font-semibold text-center mb-3">
                                {changePasswordSuccess}
                            </Text>
                        ) : null}

                        {/* ACTIONS */}
                        <View className="flex-row gap-x-3 mt-2">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    setShowChangePasswordModal(false);
                                    clearPasswordState();
                                }}
                                className="flex-1 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl items-center justify-center"
                            >
                                <Text className="text-white text-sm font-semibold">
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                                className="flex-1 h-12 bg-[#11E0C5] rounded-xl items-center justify-center"
                            >
                                {changingPassword ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Text className="text-[#071018] text-sm font-bold">
                                        Update
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* LOGOUT CONFIRMATION MODAL */}
            <Modal
                visible={showLogoutModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (!loggingOut && !logoutSuccess) {
                        setShowLogoutModal(false);
                    }
                }}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View
                        className={`${glassCard} w-full p-6 border border-white/[0.08]`}
                        style={{
                            backgroundColor: "#0D1420",
                            shadowColor: "#EF4444",
                            shadowOpacity: 0.05,
                            shadowRadius: 25,
                            elevation: 15,
                        }}
                    >
                        <Text className="text-white text-xl font-bold tracking-tight mb-2 text-center">
                            {logoutSuccess ? "Signed Out" : "Confirm Logout"}
                        </Text>
                        
                        {logoutSuccess ? (
                            <View className="items-center py-4">
                                <View className="w-12 h-12 rounded-full bg-[#10B981]/15 items-center justify-center mb-3">
                                    <Feather name="check" size={24} color="#10B981" />
                                </View>
                                <Text className="text-green-400 text-sm font-semibold text-center">
                                    Logged out successfully!
                                </Text>
                                <Text className="text-[#748096] text-xs mt-1 text-center">
                                    Redirecting you to login...
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-[#748096] text-sm text-center mb-6">
                                    Are you sure you want to log out of your RideSync account?
                                </Text>

                                {logoutError ? (
                                    <Text className="text-red-500 text-xs font-semibold text-center mb-3">
                                        {logoutError}
                                    </Text>
                                ) : null}

                                <View className="flex-row gap-x-3">
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => setShowLogoutModal(false)}
                                        disabled={loggingOut}
                                        className="flex-1 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl items-center justify-center"
                                    >
                                        <Text className="text-white text-sm font-semibold">
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={confirmLogout}
                                        disabled={loggingOut}
                                        className="flex-1 h-12 bg-red-500 rounded-xl items-center justify-center"
                                    >
                                        {loggingOut ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-white text-sm font-bold">
                                                Log Out
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
