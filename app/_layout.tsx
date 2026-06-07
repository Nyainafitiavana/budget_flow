// app/_layout.tsx
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useTheme } from '@/hooks/use-theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import { storageService } from '@/hooks/use-storage';
import { LicenseScreen } from '@/components/LicenseScreen';
import "../global.css";
import { ActivityIndicator, View } from "react-native";

export const unstable_settings = {
    anchor: "(tabs)",
};

function RootLayoutNav() {
    const { isDark, isLoading } = useTheme();
    const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const checkLicenseStatus = useCallback(async () => {
        try {
            const licensed = await storageService.getItem<boolean>('isLicensed');
            console.log('🔍 License status from storage:', licensed);

            setIsLicensed(licensed === true);
        } catch (error) {
            console.error('Error checking license:', error);
            setIsLicensed(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkLicenseStatus();
    }, [checkLicenseStatus, refreshKey]);

    const handleActivated = useCallback(() => {
        console.log('🎉 Activation confirmed, refreshing app state...');
        setIsChecking(true);
        setRefreshKey(prev => prev + 1);
    }, []);

    if (isLoading || isChecking) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!isLicensed) {
        console.log('📱 Rendering LicenseScreen');
        return <LicenseScreen onActivated={handleActivated} />;
    }

    console.log('🏠 Rendering Main App');
    return (
        <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={isDark ? "light" : "dark"} />
        </NavigationThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <Provider store={store}>
            <RootLayoutNav />
        </Provider>
    );
}