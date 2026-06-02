import { useState } from 'react';
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
    Animated
} from 'react-native';
import Svg, { Path } from "react-native-svg";
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { COLORS } from '@/constants/theme';
import {
    glassCard,
    inputField,
    primaryButton,
    googleButton,
    divider
} from '@/constants/styles';
import {
    saveAccessToken,
    saveRefreshToken,
    saveUserRole
} from "@/services/storage";

export default function SignIn() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
        if (errorMessage) { setErrorMessage(''); }
        if (successMessage) { setSuccessMessage(''); }
    };

    const handleLogin = async () => {
        clearMessages();
        if (!identifier.trim() || !password) {
            showAnimatedMessage("Please enter your email and password.");
            return;
        }
        try {
            setLoading(true);
            const response = await api.post('/users/login', {
                email: identifier.trim(),
                password: password
            });
            const { accessToken, refreshToken, user, driver } = response.data.data;
            if (!accessToken || !refreshToken) {
                throw new Error("Invalid response from server");
            }
            await saveAccessToken(accessToken);
            await saveRefreshToken(refreshToken);
            await saveUserRole(user.role);
            console.log("LOGIN RESPONSE:", response.data);
            showAnimatedMessage("Logged in successfully!", "success");
            setTimeout(() => {
                if (user.role === "rider") {
                    router.replace("/(rider)/home");
                } else if (user.role === "driver") {
                    if (driver?.driverVerified === "verified") {
                        router.replace("/(driver)/home");
                    } else {
                        router.replace("/(driver)/documents");
                    }
                } else {
                    router.replace("/");
                }
            }, 1200);
        } catch (error: any) {
            console.log("LOGIN ERROR:", error?.response?.data || error.message);
            const message = error?.response?.data?.message || "Unable to connect to server.";
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
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                >
                    <SafeAreaView className="flex-1 px-5 py-4">
                        {/* HEADER */}
                        <View className="flex-row items-center mt-1 px-1">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="p-2 -ml-2"
                                onPress={() => router.replace('/')}
                            >
                                <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                            </TouchableOpacity>
                            <Text className="text-white text-[25px] italic ml-5 tracking-wide">
                                signin
                            </Text>
                        </View>

                        {/* MAIN CARD */}
                        <View
                            className={`${glassCard} mt-24 mx-3 px-6 py-8 rounded-[32px] min-h-[520px] justify-center border border-white/[0.08]`}
                            style={{
                                shadowColor: "#11E0C5",
                                shadowOpacity: 0.08,
                                shadowRadius: 20,
                                elevation: 10,
                            }}
                        >
                            {/* HEADING */}
                            <View className="mb-6">
                                <Text className="text-white text-[30px] font-bold tracking-tight">
                                    Welcome Back
                                </Text>
                                <Text className="text-[#748096] text-[14px] mt-1">
                                    Sign in to continue your journey
                                </Text>
                            </View>

                            {/* INPUTS */}
                            <View className="gap-y-4">
                                {/* EMAIL */}
                                <View className={`${inputField} ${errorMessage ? 'border border-red-500/40' : ''}`}>
                                    <Text className="text-[#667085] text-base mr-3">✉</Text>
                                    <TextInput
                                        placeholder="Email or Phone Number"
                                        placeholderTextColor="#667085"
                                        value={identifier}
                                        onChangeText={(text) => {
                                            setIdentifier(text);
                                            clearMessages();
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!loading}
                                        className="flex-1 text-white text-[15px]"
                                    />
                                </View>
                                {/* PASSWORD */}
                                <View className={`${inputField} ${errorMessage ? 'border border-red-500/40' : ''}`}>
                                    <Text className="text-[#667085] text-base mr-3">🔒</Text>
                                    <TextInput
                                        placeholder="Password"
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

                            {/* FORGOT PASSWORD */}
                            <TouchableOpacity
                                onPress={() => router.push("/forgot-password")}
                                activeOpacity={0.7}
                                className="self-end mt-4">
                                <Text className="text-[#11E0C5] text-[13px] font-medium">
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>

                            {/* LOGIN BUTTON */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                className={`${primaryButton} mt-5`}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#071018" />
                                ) : (
                                    <Text className="text-[#071018] text-[16px] font-bold">
                                        Login
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* DIVIDER */}
                            <View className="flex-row items-center my-5">
                                <View className={divider} />
                                <Text className="text-[#667085] text-[12px] px-3 tracking-wide">
                                    or continue with
                                </Text>
                                <View className={divider} />
                            </View>

                            {/* GOOGLE BUTTON */}
                            <TouchableOpacity activeOpacity={0.85} className={googleButton}>
                                <View className="w-6 h-6 items-center justify-center mr-2">
                                    <Svg width={18} height={18} viewBox="0 0 48 48">
                                        <Path
                                            fill="#FFC107"
                                            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                                        />
                                        <Path
                                            fill="#FF3D00"
                                            d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                                        />
                                        <Path
                                            fill="#4CAF50"
                                            d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
                                        />
                                        <Path
                                            fill="#1976D2"
                                            d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6.2 7.1l6.2 5.2C39.5 36.5 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"
                                        />
                                    </Svg>
                                </View>
                                <Text className="text-white text-[15px] font-medium">
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>

                            {/* FOOTER */}
                            <View className="flex-row justify-center items-center mt-6">
                                <Text className="text-[#748096] text-[13px]">
                                    {"Don't have an account?"}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => router.replace('/(auth)/signup')}
                                >
                                    <Text className="text-[#11E0C5] text-[13px] font-semibold ml-1">
                                        Sign up
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}