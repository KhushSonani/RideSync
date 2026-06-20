import { useTheme } from "@/store/ThemeContext";
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
import { router } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { glassCard, inputField, primaryButton } from '@/constants/styles';
import { api } from '@/services/api';

export default function ForgotPassword() {
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [receivedToken, setReceivedToken] = useState('');

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

    const handleSendRequest = async () => {
        clearMessages();
        if (!email.trim()) {
            showAnimatedMessage("Please enter your email address.");
            return;
        }
        try {
            setLoading(true);
            const response = await api.post('/users/forgot-password', {
                email: email.trim(),
            });

            const token = response.data?.data?.resetToken;
            if (token) {
                setReceivedToken(token);
            }

            showAnimatedMessage(response.data?.message || "Reset link generated successfully!", "success");
        } catch (error: any) {
            console.log("FORGOT PASSWORD ERROR:", error?.response?.data || error.message);
            const message = error?.response?.data?.message || "Unable to request password reset.";
            showAnimatedMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
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
                            <Text className="text-foreground text-[25px] italic ml-5 tracking-wide">
                                forgot password
                            </Text>
                        </View>

                        {/* MAIN CARD */}
                        <View
                            className={`${glassCard} mt-24 mx-3 px-6 py-8 rounded-[32px] min-h-[400px] justify-center border border-border`}
                            style={{
                                shadowColor: theme.colors.primary,
                                shadowOpacity: 0.08,
                                shadowRadius: 20,
                                elevation: 10,
                            }}
                        >
                            {/* HEADING */}
                            <View className="mb-6">
                                <Text className="text-foreground text-[28px] font-bold tracking-tight">
                                    Reset Password
                                </Text>
                                <Text className="text-muted text-[14px] mt-1">
                                    Enter your email to receive a password reset link
                                </Text>
                            </View>

                            {/* INPUTS */}
                            <View className="gap-y-4">
                                <View className={`${inputField} ${errorMessage ? 'border border-red-500/40' : ''}`}>
                                    <Text className="text-[#667085] text-base mr-3">✉</Text>
                                    <TextInput
                                        placeholder="Email Address"
                                        placeholderTextColor="#667085"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            clearMessages();
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!loading}
                                        className="flex-1 text-foreground text-[15px]"
                                    />
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

                            {/* LOCAL DEVELOPMENT CONVENIENCE BLOCK */}
                            {receivedToken ? (
                                <View className="mt-6 p-4 bg-input/90 border border-primary/20 rounded-2xl">
                                    <Text className="text-foreground text-sm font-semibold mb-1">
                                        Demo Bypass / Token Detected:
                                    </Text>
                                    <Text className="text-primary text-xs font-mono select-all">
                                        {receivedToken}
                                    </Text>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => router.push({
                                            pathname: "/(auth)/reset-password/[token]",
                                            params: { token: receivedToken }
                                        })}
                                        className="mt-3 py-2 bg-primary/10 border border-primary/30 rounded-xl items-center"
                                    >
                                        <Text className="text-primary text-[13px] font-bold">
                                            Go to Reset Password Screen
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            {/* ACTION BUTTON */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                className={`${primaryButton} mt-6`}
                                onPress={handleSendRequest}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Text className="text-background text-[16px] font-bold">
                                        Send Reset Instructions
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* BACK TO LOGIN FOOTER */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="align-center items-center mt-6"
                                onPress={() => router.replace('/(auth)/signin')}
                            >
                                <Text className="text-muted text-[13px]">
                                    Remembered your password? <Text className="text-primary font-semibold">Sign in</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
