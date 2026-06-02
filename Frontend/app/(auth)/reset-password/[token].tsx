import React, { useState } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { glassCard, inputField, primaryButton } from '@/constants/styles';
import { api } from '@/services/api';
import { saveAccessToken, saveRefreshToken } from '@/services/storage';

export default function ResetPassword() {
    const { token } = useLocalSearchParams<{ token: string }>();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));

    const showAnimatedMessage = (message: string, type: 'error' | 'success' = 'error') => {
        fadeAnim.setValue(0);
        if (type === 'error') {
            setSuccessMessage('');
            setErrorMessage(message);
        } else {
            setErrorMessage('');
            setSuccessMessage(message);
        }
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start();
    };

    const clearMessages = () => {
        if (errorMessage) setErrorMessage('');
        if (successMessage) setSuccessMessage('');
    };

    const handleResetPassword = async () => {
        clearMessages();
        if (!password || !confirmPassword) {
            showAnimatedMessage("Please fill in all password fields.");
            return;
        }
        if (password.length < 6) {
            showAnimatedMessage("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            showAnimatedMessage("Passwords do not match.");
            return;
        }
        if (!token) {
            showAnimatedMessage("Missing password reset token.");
            return;
        }
        try {
            setLoading(true);
            const response = await api.post(`/users/reset-password/${token}`, {
                password: password,
            });

            const { accessToken, refreshToken } = response.data.data;
            await saveAccessToken(accessToken);
            await saveRefreshToken(refreshToken);

            showAnimatedMessage("Password reset successful! Logging you in...", "success");

            setTimeout(() => {
                router.replace('/');
            }, 1500);
        } catch (error: any) {
            console.log("RESET PASSWORD ERROR:", error?.response?.data || error.message);
            const message = error?.response?.data?.message || "Failed to reset password.";
            showAnimatedMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* PREMIUM BACKGROUND */}
            <View className="absolute inset-0 overflow-hidden">
                <View
                    className="absolute -top-32 -right-16 w-[380px] h-[380px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />
                <View
                    className="absolute top-[300px] -left-20 w-[240px] h-[240px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
                />
                <View className="absolute bottom-[-80px] -left-20 w-[260px] h-[260px] rounded-full bg-[#0A84FF]/10" />
                <View
                    className="absolute top-[-20px] right-[-40px] w-[290px] h-[290px] rounded-full items-center justify-center"
                    style={{ backgroundColor: COLORS.glowRing }}
                >
                    <View className="w-[210px] h-[210px] rounded-full bg-[#1D6B61]/15" />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    <SafeAreaView className="flex-1 px-5 py-4">
                        {/* HEADER */}
                        <View className="flex-row items-center mt-1 px-1">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="p-2 -ml-2"
                                onPress={() => router.replace('/(auth)/signin')}
                            >
                                <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                            </TouchableOpacity>
                            <Text className="text-white text-[25px] italic ml-5 tracking-wide">
                                reset password
                            </Text>
                        </View>

                        {/* MAIN CARD */}
                        <View
                            className={`${glassCard} mt-24 mx-3 px-6 py-8 rounded-[32px] min-h-[420px] justify-center border border-white/[0.08]`}
                            style={{
                                shadowColor: "#11E0C5",
                                shadowOpacity: 0.08,
                                shadowRadius: 20,
                                elevation: 10,
                            }}
                        >
                            {/* HEADING */}
                            <View className="mb-6">
                                <Text className="text-white text-[28px] font-bold tracking-tight">
                                    Create New Password
                                </Text>
                                <Text className="text-[#748096] text-[14px] mt-1">
                                    Enter your new password below to reset your credentials
                                </Text>
                            </View>

                            {/* INPUTS */}
                            <View className="gap-y-4">
                                {/* NEW PASSWORD */}
                                <View className={`${inputField} ${errorMessage ? 'border border-red-500/40' : ''}`}>
                                    <Text className="text-[#667085] text-base mr-3">🔒</Text>
                                    <TextInput
                                        placeholder="New Password"
                                        placeholderTextColor="#667085"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            clearMessages();
                                        }}
                                        secureTextEntry={!isPasswordVisible}
                                        autoCapitalize="none"
                                        editable={!loading}
                                        className="flex-1 text-white text-[15px]"
                                    />
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                    >
                                        <Feather 
                                            name={isPasswordVisible ? "eye" : "eye-off"} 
                                            size={16} 
                                            color="#667085" 
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* CONFIRM PASSWORD */}
                                <View className={`${inputField} ${errorMessage ? 'border border-red-500/40' : ''}`}>
                                    <Text className="text-[#667085] text-base mr-3">🛡️</Text>
                                    <TextInput
                                        placeholder="Confirm Password"
                                        placeholderTextColor="#667085"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            clearMessages();
                                        }}
                                        secureTextEntry={!isConfirmPasswordVisible}
                                        autoCapitalize="none"
                                        editable={!loading}
                                        className="flex-1 text-white text-[15px]"
                                    />
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                    >
                                        <Feather 
                                            name={isConfirmPasswordVisible ? "eye" : "eye-off"} 
                                            size={16} 
                                            color="#667085" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ERROR MESSAGE */}
                            {errorMessage ? (
                                <Animated.Text
                                    style={{ opacity: fadeAnim }}
                                    className="text-red-500 text-[13px] mt-4 text-center font-medium"
                                >
                                    {errorMessage}
                                </Animated.Text>
                            ) : null}

                            {/* SUCCESS MESSAGE */}
                            {successMessage ? (
                                <Animated.Text
                                    style={{ opacity: fadeAnim }}
                                    className="text-green-400 text-[13px] mt-4 text-center font-medium"
                                >
                                    {successMessage}
                                </Animated.Text>
                            ) : null}

                            {/* ACTION BUTTON */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                className={`${primaryButton} mt-6`}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Text className="text-[#071018] text-[16px] font-bold">
                                        Update Password
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* BACK TO LOGIN FOOTER */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="align-center items-center mt-6"
                                onPress={() => router.replace('/(auth)/signin')}
                            >
                                <Text className="text-[#748096] text-[13px]">
                                    Go back to <Text className="text-[#11E0C5] font-semibold">Sign in</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
