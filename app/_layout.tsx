// app/_layout.tsx
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useTheme } from '@/hooks/use-theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { I18nextProvider } from 'react-i18next';
import i18n, { getStoredLanguage, changeLanguage } from '@/i18';
import "../global.css";
import {ActivityIndicator, View} from "react-native";

export const unstable_settings = {
    anchor: "(tabs)",
};

function RootLayoutNav() {
    const { isDark, isLoading } = useTheme();
    const [isI18nReady, setIsI18nReady] = useState(false);

    useEffect(() => {
        const initLanguage = async () => {
            const savedLang = await getStoredLanguage();
            await changeLanguage(savedLang);
            setIsI18nReady(true);
        };
        initLanguage();
    }, []);

    if (isLoading || !isI18nReady) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

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
            <I18nextProvider i18n={i18n}>
                <RootLayoutNav />
            </I18nextProvider>
        </Provider>
    );
}