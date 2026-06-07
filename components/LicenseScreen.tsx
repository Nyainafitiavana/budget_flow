// components/LicenseScreen.tsx - Version finale corrigée
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import * as Crypto from 'expo-crypto';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { storageService } from '@/hooks/use-storage';
import * as Clipboard from 'expo-clipboard';
import CryptoJS from 'crypto-js';

const SECRET_KEY = "BudgetFlow2024-SecretKey-!@#$%^&*()";

interface LicenseScreenProps {
    onActivated: () => void;
}

export const LicenseScreen: React.FC<LicenseScreenProps> = ({ onActivated }) => {
    const { colors } = useTheme();
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [licenseCode, setLicenseCode] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const generateDeviceCode = useCallback(async () => {
        try {
            const existingCode = await storageService.getItem<string>('deviceCode');
            if (existingCode) {
                setDeviceCode(existingCode);
                return;
            }

            const timestamp = Date.now().toString();
            const random = Math.random().toString(36).substring(2, 15);
            const platform = Platform.OS === 'web' ? 'web' : 'mobile';
            const combined = `${platform}-${timestamp}-${random}`;

            const hash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                combined
            );
            const rawCode = hash.substring(0, 12).toUpperCase();
            const formattedCode = rawCode.match(/.{1,4}/g)?.join('-') || rawCode;

            await storageService.setItem('deviceCode', formattedCode);
            setDeviceCode(formattedCode);
        } catch (error) {
            console.error('Error generating device code:', error);
            const fallbackCode = ['ABCD', 'EFGH', 'IJKL'].join('-');
            setDeviceCode(fallbackCode);
            await storageService.setItem('deviceCode', fallbackCode);
        }
    }, []);

    // HMAC-SHA256 identical to backend
    const generateExpectedLicense = useCallback((code: string): string => {
        const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const hash = CryptoJS.HmacSHA256(cleanCode, SECRET_KEY).toString();
        const rawLicense = hash.substring(0, 12).toUpperCase();
        return rawLicense.match(/.{1,4}/g)?.join('-') || rawLicense;
    }, []);

    const verifyLicense = useCallback((code: string, license: string): boolean => {
        const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const cleanLicense = license.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const expected = generateExpectedLicense(cleanCode);
        const cleanExpected = expected.replace(/[^A-Z0-9]/g, '');

        console.log('🔍 Verification:');
        console.log('   Clean device:', cleanCode);
        console.log('   Clean license:', cleanLicense);
        console.log('   Clean expected:', cleanExpected);
        console.log('   Match:', cleanLicense === cleanExpected);

        return cleanLicense === cleanExpected;
    }, [generateExpectedLicense]);

    useEffect(() => {
        const init = async () => {
            await generateDeviceCode();
            setIsLoading(false);
        };
        init();
    }, [generateDeviceCode]);

    const handleActivate = async () => {
        if (!licenseCode.trim()) {
            Alert.alert('Error', 'Please enter your license code');
            return;
        }

        setIsVerifying(true);

        try {
            const isValid = verifyLicense(deviceCode, licenseCode);

            if (isValid) {
                console.log('✅ License valid, saving activation...');
                await storageService.setItem('isLicensed', true);
                await storageService.setItem('licensedAt', new Date().toISOString());
                console.log('✅ Activation saved');
                Alert.alert('✅ Success', 'Your license has been activated!');
                onActivated();
            } else {
                const expected = generateExpectedLicense(deviceCode);
                Alert.alert('❌ Invalid license', `Expected: ${expected}\n\nYour: ${licenseCode}`);
            }
        } catch (error) {
            console.error('Verification error:', error);
            Alert.alert('Error', 'Unable to verify license');
        } finally {
            setIsVerifying(false);
        }
    };

    const copyDeviceCode = async () => {
        await Clipboard.setStringAsync(deviceCode);
        Alert.alert('Copied', 'Device code copied to clipboard');
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            style={{ backgroundColor: colors.background }}
        >
            <View className="flex-1 items-center justify-center p-6">
                <View className="mb-8">
                    <View className="w-20 h-20 rounded-2xl bg-blue-600 items-center justify-center">
                        <MaterialIcons name="lock" size={40} color="white" />
                    </View>
                </View>

                <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.text }}>
                    BudgetFlow
                </Text>
                <Text className="text-sm mb-8 text-center" style={{ color: colors.textSecondary }}>
                    License Activation
                </Text>

                <View className="w-full mb-8">
                    <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                        Device Code
                    </Text>
                    <TouchableOpacity
                        onPress={copyDeviceCode}
                        className="p-4 rounded-xl flex-row justify-between items-center"
                        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    >
                        <Text className="text-lg font-mono" style={{ color: colors.primary }}>
                            {deviceCode}
                        </Text>
                        <MaterialIcons name="content-copy" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text className="text-xs mt-2 text-center" style={{ color: colors.textSecondary }}>
                        Send this code to the administrator to get your license
                    </Text>
                </View>

                <View className="w-full mb-8">
                    <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                        License Key
                    </Text>
                    <TextInput
                        placeholder="XXXX-XXXX-XXXX"
                        placeholderTextColor={colors.textSecondary}
                        value={licenseCode}
                        onChangeText={setLicenseCode}
                        className="p-4 rounded-xl text-center font-mono text-lg"
                        style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={14}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleActivate}
                    disabled={isVerifying}
                    className="w-full py-4 rounded-xl mb-4"
                    style={{ backgroundColor: colors.primary, opacity: isVerifying ? 0.7 : 1 }}
                >
                    <Text className="text-white text-center font-semibold text-lg">
                        {isVerifying ? 'Verifying...' : 'Activate'}
                    </Text>
                </TouchableOpacity>

                <Text className="text-xs text-center mt-4" style={{ color: colors.textSecondary }}>
                    Need help? Contact us on Facebook
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
};