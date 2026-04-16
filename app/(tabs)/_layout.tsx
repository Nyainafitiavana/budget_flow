import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { HapticTab } from '@/components/haptic-tab';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
    const { isDark, isLoading } = useTheme();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#64748B',
                tabBarStyle: {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderTopColor: isDark ? '#334155' : '#E2E8F0',
                    height: 60,
                    paddingBottom: 4,
                    paddingTop: 4,
                },
                headerStyle: {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                },
                headerTintColor: isDark ? '#F8FAFC' : '#1E293B',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons size={24} name={focused ? "home" : "home"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons size={24} name={focused ? "bar-chart" : "bar-chart"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="budgets"
                options={{
                    title: 'Budgets',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons size={24} name={focused ? "account-balance-wallet" : "account-balance-wallet"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="accounts"
                options={{
                    title: 'Comptes',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons size={24} name={focused ? "account-balance" : "account-balance"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Paramètres',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons size={24} name={focused ? "settings" : "settings"} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}