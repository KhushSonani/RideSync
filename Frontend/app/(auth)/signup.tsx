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
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { COLORS } from '@/constants/theme';
import { api } from '@/services/api';

import {
    saveAccessToken,
    saveRefreshToken
} from '@/services/storage';

export default function SignUp() {

    const [step, setStep] = useState(1);

    const [fullname, setFullname] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const [role, setRole] = useState<'rider' | 'driver'>('rider');

    const [licenseNumber, setLicenseNumber] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [color, setColor] = useState('');
    const [year, setYear] = useState('');
    const [plate, setPlate] = useState('');
    const [capacity, setCapacity] = useState('');

    const [vehicleType, setVehicleType] = useState<
        'car' | 'bike' | 'scooter' | 'auto' | ''
    >('');

    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

    const [loading, setLoading] = useState(false);

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [fadeAnim] = useState(new Animated.Value(0));

    const vehicleOptions = [
        'car',
        'bike',
        'scooter',
        'auto',
    ];

    const showAnimatedMessage = (
        message: string,
        type: 'error' | 'success' = 'error'
    ) => {
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

    const handleSignup = async () => {
        clearMessages();
        if (
            !username.trim() ||
            !fullname.trim() ||
            !email.trim() ||
            !password
        ) {
            showAnimatedMessage("Please fill all required fields.");
            return;
        }
        if (password !== confirmPassword) {
            showAnimatedMessage("Passwords do not match.");
            return;
        }

        if (role === "driver") {
            if (
                !licenseNumber.trim() ||
                !make.trim() ||
                !model.trim() ||
                !color.trim() ||
                !year.trim() ||
                !plate.trim() ||
                !capacity.trim() ||
                !vehicleType.trim()
            ) {
                showAnimatedMessage("Please fill all vehicle details.");
                return;
            }
        }

        try {
            setLoading(true);
            const response = await api.post(
                "/users/signup",
                {
                    username: username.trim(),
                    fullname: fullname.trim(),
                    email: email.trim(),
                    password,
                    role,
                    ...(role === "driver" && {
                        vehicle: {
                            make: make.trim(),
                            model: model.trim(),
                            color: color.trim(),
                            year: Number(year),
                            plate: plate.trim(),
                            capacity: Number(capacity),
                            vehicleType,
                            rc: {
                                number: licenseNumber.trim(),
                            },
                        }
                    }),
                }
            );
            const { accessToken, refreshToken } = response.data.data;
            if (!accessToken || !refreshToken) {
                throw new Error("Invalid server response");
            }

            await saveAccessToken(accessToken);
            await saveRefreshToken(refreshToken);

            showAnimatedMessage("Account created successfully!", "success");

            setTimeout(() => {
                router.replace("/(tabs)/home");
            }, 1200);

        } catch (error: any) {
            console.log(
                "SIGNUP ERROR:",
                error?.response?.data || error.message
            );
            const message = error?.response?.data?.message || "Unable to create account.";
            showAnimatedMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >

            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor="transparent"
            />

            {/* BACKGROUND */}
            <View className="absolute inset-0 overflow-hidden">

                <View
                    className="absolute -top-32 -right-16 w-[350px] h-[350px] rounded-full"
                    style={{ backgroundColor: COLORS.glowPrimary }}
                />

                <View
                    className="absolute top-[280px] -left-20 w-[220px] h-[220px] rounded-full"
                    style={{ backgroundColor: COLORS.glowBlue }}
                />

                <View className="absolute bottom-[-80px] -left-20 w-[260px] h-[260px] rounded-full bg-[#0A84FF]/10" />

                <View
                    className="absolute top-[-20px] right-[-40px] w-[260px] h-[260px] rounded-full items-center justify-center"
                    style={{ backgroundColor: COLORS.glowRing }}
                >
                    <View className="w-[190px] h-[190px] rounded-full bg-[#1D6B61]/15" />
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
                    contentContainerStyle={{
                        paddingBottom: 30
                    }}
                >

                    <SafeAreaView className="flex-1 px-5 py-3">

                        {/* HEADER */}
                        <View className="flex-row items-center mt-1 px-1">

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (step > 1) {
                                        setStep(1);
                                    } else {
                                        router.replace('/');
                                    }
                                }}
                                className="p-2 -ml-2"
                            >
                                <View className="w-4 h-4 border-l-2 border-t-2 border-white/90 transform -rotate-45 mt-0.5 ml-1" />
                            </TouchableOpacity>

                            <Text className="text-white text-[24px] italic ml-5 tracking-wide">
                                signup
                            </Text>

                        </View>

                        {/* MAIN CARD */}
                        <View
                            className="
                                mt-16
                                mx-3
                                px-6
                                py-6
                                min-h-[640px]
                                bg-[#0D1420]/80
                                border
                                border-white/[0.08]
                                rounded-[32px]
                                shadow-xl
                            "
                            style={{
                                shadowColor: '#11E0C5',
                                shadowOpacity: 0.08,
                                shadowRadius: 20,
                                elevation: 10,
                            }}
                        >

                            {/* HEADING */}
                            <View className="mb-4">

                                <Text className="text-white text-[26px] font-bold tracking-tight">
                                    {
                                        step === 1
                                            ? 'Get Started'
                                            : 'Vehicle Details'
                                    }
                                </Text>

                                <Text className="text-[#748096] text-[13px] mt-0.5">
                                    {
                                        step === 1
                                            ? 'Step 1 of 2: Create profile credentials'
                                            : 'Step 2 of 2: Infrastructure data'
                                    }
                                </Text>

                            </View>

                            {/* STEP 1 */}
                            {
                                step === 1 && (
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            paddingBottom: 20
                                        }}
                                    >

                                        <View className="gap-y-3">

                                            {/* ROLE SWITCH */}
                                            <View className="flex-row bg-[#131D2B]/95 p-1 rounded-xl border border-white/[0.04] mb-1">

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setRole('rider');
                                                        clearMessages();
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg items-center justify-center ${role === 'rider'
                                                        ? 'bg-[#11E0C5]'
                                                        : ''
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-[13px] font-bold ${role === 'rider'
                                                            ? 'text-[#071018]'
                                                            : 'text-[#748096]'
                                                            }`}
                                                    >
                                                        Rider
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setRole('driver');
                                                        clearMessages();
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg items-center justify-center ${role === 'driver'
                                                        ? 'bg-[#11E0C5]'
                                                        : ''
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-[13px] font-bold ${role === 'driver'
                                                            ? 'text-[#071018]'
                                                            : 'text-[#748096]'
                                                            }`}
                                                    >
                                                        Driver
                                                    </Text>
                                                </TouchableOpacity>

                                            </View>

                                            {/* FULL NAME */}
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    👤
                                                </Text>

                                                <TextInput
                                                    placeholder="Full Name *"
                                                    placeholderTextColor="#667085"
                                                    value={fullname}
                                                    onChangeText={(text) => {
                                                        setFullname(text);
                                                        clearMessages();
                                                    }}
                                                    editable={!loading}
                                                    className="flex-1 text-white text-[15px]"
                                                />

                                            </View>

                                            {/* USERNAME */}
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    🏷️
                                                </Text>

                                                <TextInput
                                                    placeholder="Username *"
                                                    placeholderTextColor="#667085"
                                                    value={username}
                                                    onChangeText={(text) => {
                                                        setUsername(text);
                                                        clearMessages();
                                                    }}
                                                    autoCapitalize="none"
                                                    editable={!loading}
                                                    className="flex-1 text-white text-[15px]"
                                                />

                                            </View>

                                            {/* EMAIL */}
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    ✉
                                                </Text>

                                                <TextInput
                                                    placeholder="Email Address *"
                                                    placeholderTextColor="#667085"
                                                    value={email}
                                                    onChangeText={(text) => {
                                                        setEmail(text);
                                                        clearMessages();
                                                    }}
                                                    keyboardType="email-address"
                                                    autoCapitalize="none"
                                                    editable={!loading}
                                                    className="flex-1 text-white text-[15px]"
                                                />

                                            </View>

                                            {/* PASSWORD */}
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    🔒
                                                </Text>

                                                <TextInput
                                                    placeholder="Password *"
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
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    🛡️
                                                </Text>

                                                <TextInput
                                                    placeholder="Confirm Password *"
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

                                            {/* BUTTON */}
                                            <TouchableOpacity
                                                activeOpacity={0.85}
                                                disabled={loading}
                                                onPress={() => {
                                                    if (role === "driver") {
                                                        setStep(2);
                                                    } else {
                                                        handleSignup();
                                                    }
                                                }}
                                                className="h-13 bg-[#11E0C5] rounded-xl items-center justify-center mt-4 border border-[#6FFFEF]/10"
                                            >

                                                {
                                                    loading ? (
                                                        <ActivityIndicator color="#071018" />
                                                    ) : (
                                                        <Text className="text-[#071018] text-[16px] font-bold">
                                                            {
                                                                role === 'driver'
                                                                    ? 'Next Step'
                                                                    : 'Sign Up'
                                                            }
                                                        </Text>
                                                    )
                                                }

                                            </TouchableOpacity>

                                        </View>
                                    </ScrollView>
                                )
                            }

                            {/* STEP 2 */}
                            {
                                step === 2 && role === 'driver' && (

                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            paddingBottom: 20
                                        }}
                                    >

                                        <View className="gap-y-3">

                                            {/* LICENSE */}
                                            <View className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                <Text className="text-[#667085] text-base mr-2.5">
                                                    🪪
                                                </Text>

                                                <TextInput
                                                    placeholder="License Number *"
                                                    placeholderTextColor="#667085"
                                                    value={licenseNumber}
                                                    onChangeText={(text) => {
                                                        setLicenseNumber(text);
                                                        clearMessages();
                                                    }}
                                                    autoCapitalize="characters"
                                                    editable={!loading}
                                                    className="flex-1 text-white text-[15px]"
                                                />

                                            </View>

                                            {/* MAKE + MODEL */}
                                            <View className="flex-row gap-x-2">

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Make *"
                                                        placeholderTextColor="#667085"
                                                        value={make}
                                                        onChangeText={(text) => {
                                                            setMake(text);
                                                            clearMessages();
                                                        }}
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Model *"
                                                        placeholderTextColor="#667085"
                                                        value={model}
                                                        onChangeText={(text) => {
                                                            setModel(text);
                                                            clearMessages();
                                                        }}
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                            </View>

                                            {/* COLOR + YEAR */}
                                            <View className="flex-row gap-x-2">

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Color *"
                                                        placeholderTextColor="#667085"
                                                        value={color}
                                                        onChangeText={(text) => {
                                                            setColor(text);
                                                            clearMessages();
                                                        }}
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Year *"
                                                        placeholderTextColor="#667085"
                                                        value={year}
                                                        onChangeText={(text) => {
                                                            setYear(text);
                                                            clearMessages();
                                                        }}
                                                        keyboardType="numeric"
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                            </View>

                                            {/* PLATE + CAPACITY */}
                                            <View className="flex-row gap-x-2">

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Plate *"
                                                        placeholderTextColor="#667085"
                                                        value={plate}
                                                        onChangeText={(text) => {
                                                            setPlate(text);
                                                            clearMessages();
                                                        }}
                                                        autoCapitalize="characters"
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                                <View className={`flex-1 h-13 bg-[#131D2B]/95 rounded-xl px-4 justify-center ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}>

                                                    <TextInput
                                                        placeholder="Capacity *"
                                                        placeholderTextColor="#667085"
                                                        value={capacity}
                                                        onChangeText={(text) => {
                                                            setCapacity(text);
                                                            clearMessages();
                                                        }}
                                                        keyboardType="numeric"
                                                        editable={!loading}
                                                        className="text-white text-[14px]"
                                                    />

                                                </View>

                                            </View>

                                            {/* VEHICLE TYPE */}
                                            <View>

                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() =>
                                                        setShowVehicleDropdown(
                                                            !showVehicleDropdown
                                                        )
                                                    }
                                                    className={`h-13 bg-[#131D2B]/95 rounded-xl px-4 flex-row items-center justify-between ${errorMessage ? 'border border-red-500/40' : 'border border-white/[0.06]'}`}
                                                >

                                                    <Text
                                                        className={`text-[14px] ${vehicleType
                                                            ? 'text-white'
                                                            : 'text-[#667085]'
                                                            }`}
                                                    >
                                                        {
                                                            vehicleType
                                                                ? vehicleType
                                                                : 'Vehicle Type *'
                                                        }
                                                    </Text>

                                                    <Text className="text-[#667085] text-lg">
                                                        ⌄
                                                    </Text>

                                                </TouchableOpacity>

                                                {
                                                    showVehicleDropdown && (
                                                        <View className="mt-2 bg-[#131D2B] border border-white/[0.06] rounded-xl overflow-hidden">

                                                            {
                                                                vehicleOptions.map((item) => (

                                                                    <TouchableOpacity
                                                                        key={item}
                                                                        activeOpacity={0.7}
                                                                        onPress={() => {
                                                                            setVehicleType(
                                                                                item as
                                                                                | 'car'
                                                                                | 'bike'
                                                                                | 'scooter'
                                                                                | 'auto'
                                                                            );
                                                                            setShowVehicleDropdown(false);
                                                                            clearMessages();
                                                                        }}
                                                                        className="px-4 py-3 border-b border-white/[0.04]"
                                                                    >

                                                                        <Text className="text-white text-[14px] capitalize">
                                                                            {item}
                                                                        </Text>

                                                                    </TouchableOpacity>

                                                                ))
                                                            }

                                                        </View>
                                                    )
                                                }

                                            </View>

                                            {/* REGISTER BUTTON */}
                                            <TouchableOpacity
                                                activeOpacity={0.85}
                                                onPress={handleSignup}
                                                disabled={loading}
                                                className="h-13 bg-[#11E0C5] rounded-xl items-center justify-center mt-3 border border-[#6FFFEF]/10"
                                            >

                                                {
                                                    loading ? (
                                                        <ActivityIndicator color="#071018" />
                                                    ) : (
                                                        <Text className="text-[#071018] text-[16px] font-bold">
                                                            Register Profile
                                                        </Text>
                                                    )
                                                }

                                            </TouchableOpacity>

                                        </View>

                                    </ScrollView>
                                )
                            }

                            {/* ERROR MESSAGE */}
                            {
                                errorMessage ? (

                                    <Animated.Text
                                        style={{
                                            opacity: fadeAnim
                                        }}
                                        className="text-red-500 text-[13px] mt-4 text-center font-medium"
                                    >

                                        {errorMessage}

                                    </Animated.Text>

                                ) : null
                            }

                            {/* SUCCESS MESSAGE */}
                            {
                                successMessage ? (

                                    <Animated.Text
                                        style={{
                                            opacity: fadeAnim
                                        }}
                                        className="text-green-400 text-[13px] mt-4 text-center font-medium"
                                    >

                                        {successMessage}

                                    </Animated.Text>

                                ) : null
                            }

                            {/* DIVIDER */}
                            <View className="flex-row items-center my-4">

                                <View className="flex-1 h-[1px] bg-white/[0.05]" />

                                <Text className="text-[#667085] text-[11px] px-3 tracking-wide">
                                    or sign up with
                                </Text>

                                <View className="flex-1 h-[1px] bg-white/[0.05]" />

                            </View>

                            {/* GOOGLE */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                className="w-full h-12 bg-[#131D2B]/95 border border-white/[0.06] rounded-xl flex-row items-center justify-center"
                            >

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

                                <Text className="text-white text-[14px] font-medium">
                                    Google
                                </Text>

                            </TouchableOpacity>

                            {/* FOOTER */}
                            <View className="flex-row justify-center items-center mt-5">

                                <Text className="text-[#748096] text-[13px]">
                                    Already have an account?
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() =>
                                        router.replace('/(auth)/signin')
                                    }
                                >
                                    <Text className="text-[#11E0C5] text-[13px] font-semibold ml-1">
                                        Sign in
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