// app/_layout.tsx
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useTheme } from '@/hooks/use-theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import "../global.css";

export const unstable_settings = {
    anchor: "(tabs)",
};

function RootLayoutNav() {
    const { isDark, isLoading } = useTheme();

    if (isLoading) {
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
            <RootLayoutNav />
        </Provider>
    );
}