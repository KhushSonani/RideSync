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
    TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from '@expo/vector-icons';

import { api } from "@/services/api";
import { clearTokens } from "@/services/storage";
import { COLORS } from "@/constants/theme";
import { glassCard } from "@/constants/styles";
import {
    pickImageFromGallery,
    createImageFormData
} from '@/services/upload';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
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
            setUser(response.data?.data);
            Alert.alert(
                "Success",
                "Avatar uploaded successfully!",
            );

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
            setUser(response.data?.data);
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
        if (user?.avatar?.url) {
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

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/profile');
            if (response.data?.data) {
                setUser(response.data.data);
            }
        } catch (error) {
            const err = error as any;
            console.log("FETCH PROFILE ERROR:", err?.response?.data || err.message);
            // Non-blocking fallback for visual testing offline
            setUser({
                fullname: "Khush Sonani",
                username: "khush_sonani",
                email: "khush@ridesync.com",
                role: "rider",
                avatar: null,
                createdAt: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // Call backend logout endpoint
                            try {
                                await api.post('/users/logout');
                            } catch (e) {
                                const err = e as any;
                                console.log("Backend logout request failed/ignored:", err.message);
                            }
                            // Clear local SecureStore tokens
                            await clearTokens();
                            Alert.alert("Success", "Logged out successfully!", [
                                { text: "OK", onPress: () => router.replace("/") }
                            ]);
                        } catch (err) {
                            console.log("LOGOUT ERROR:", err);
                            Alert.alert("Error", "Something went wrong during logout.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Helper to get initials
    const getInitials = (name: string) => {
        if (!name) return "RS";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Format member since date
    const formatJoinDate = (dateStr: string) => {
        if (!dateStr) return "May 2026";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch (e) {
            return "May 2026";
        }
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
                {/* Bottom Left Subtle Glow */}
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
                >
                    {/* BACK NAVIGATION */}
                    <View className="flex-row items-center mt-1 px-1 mb-6">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.back()}
                            className="p-2 -ml-2"
                        >
                            <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                        </TouchableOpacity>
                        <Text className="text-white text-[24px] italic ml-5 tracking-wide">
                            profile
                        </Text>
                    </View>

                    {/* PROFILE PROFILE DETAIL BANNER */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            {/* Glowing Ring around Avatar */}
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
                            {/* Edit Button overlay */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#11E0C5] border-2 border-[#070B12] items-center justify-center shadow-lg"
                                onPress={handleAvatarPress}
                            >
                                {
                                    uploadingAvatar ? (<ActivityIndicator size="small" color="#071018" />) :
                                        (<Feather name="camera" size={14} color="#071018" />)
                                }
                            </TouchableOpacity>
                        </View>

                        <Text className="text-white text-[24px] font-bold tracking-tight mt-4">
                            {user?.fullname || "RideSync User"}
                        </Text>
                        <Text className="text-[#748096] text-[13px] mt-1 font-medium">
                            @{user?.username || "ridesync_user"}
                        </Text>

                        {/* ROLE CAPSULE */}
                        <View className="bg-[#11E0C5]/10 border border-[#11E0C5]/20 px-4 py-1.5 rounded-full mt-3 flex-row items-center">
                            <Feather name={user?.role === "driver" ? "navigation" : "user"} size={12} color="#11E0C5" className="mr-1.5" />
                            <Text className="text-[#11E0C5] text-[11px] font-bold uppercase tracking-wider">
                                {user?.role === "driver" ? "Verified Driver" : "Rider Account"}
                            </Text>
                        </View>
                    </View>

                    {/* CARD: PERSONAL DETAILS */}
                    <Text className="text-white text-[16px] font-bold mb-3 px-1">
                        Account Details
                    </Text>
                    <View className={`${glassCard} p-5 shadow-xl mb-6`}>
                        {/* EMAIL */}
                        <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-4.5 mb-4 px-1">
                            <View className="flex-row items-center">
                                <Feather name="mail" size={16} color="#748096" />
                                <Text className="text-[#748096] text-sm ml-3">Email Address</Text>
                            </View>
                            <Text className="text-white text-sm font-semibold">{user?.email || "N/A"}</Text>
                        </View>

                        {/* USERNAME */}
                        <View className="flex-row items-center justify-between border-b border-white/[0.04] pb-4.5 mb-4 px-1">
                            <View className="flex-row items-center">
                                <Feather name="hash" size={16} color="#748096" />
                                <Text className="text-[#748096] text-sm ml-3">Username</Text>
                            </View>
                            <Text className="text-white text-sm font-semibold">@{user?.username || "N/A"}</Text>
                        </View>

                        {/* MEMBER SINCE */}
                        <View className="flex-row items-center justify-between px-1">
                            <View className="flex-row items-center">
                                <Feather name="calendar" size={16} color="#748096" />
                                <Text className="text-[#748096] text-sm ml-3">Member Since</Text>
                            </View>
                            <Text className="text-white text-sm font-semibold">
                                {formatJoinDate(user?.createdAt)}
                            </Text>
                        </View>
                    </View>

                    {/* CARD: SETTINGS MENU */}
                    <Text className="text-white text-[16px] font-bold mb-3 px-1">
                        Settings & Preferences
                    </Text>
                    <View className={`${glassCard} p-3 shadow-xl mb-6 gap-y-1`}>
                        {/* EDIT PROFILE */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.02]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-[#11E0C5]/10 items-center justify-center mr-3">
                                    <Feather name="edit-3" size={15} color="#11E0C5" />
                                </View>
                                <Text className="text-white text-sm font-medium">Edit Profile Details</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>

                        {/* CHANGE PASSWORD */}
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

                        {/* PAYMENTS */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.02]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-[#0A84FF]/10 items-center justify-center mr-3">
                                    <Feather name="credit-card" size={15} color="#0A84FF" />
                                </View>
                                <Text className="text-white text-sm font-medium">Payment Methods</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>

                        {/* SECURITY */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.02]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-orange-500/10 items-center justify-center mr-3">
                                    <Feather name="shield" size={15} color="#FFA500" />
                                </View>
                                <Text className="text-white text-sm font-medium">Login & Security</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>

                        {/* HELP & SUPPORT */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.02]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-xl bg-purple-500/10 items-center justify-center mr-3">
                                    <Feather name="help-circle" size={15} color="#A855F7" />
                                </View>
                                <Text className="text-white text-sm font-medium">Help & Support</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#748096" />
                        </TouchableOpacity>
                    </View>

                    {/* LOGOUT BUTTON */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogout}
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
        </View>
    );
}