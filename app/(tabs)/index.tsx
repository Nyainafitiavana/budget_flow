// app/(tabs)/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'; // ← Ajouter Image ici
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import LogoImage from '@/assets/images/logo_home_150x150.png';
import {Footer} from "@/components/Footer";

const Index = () => {
    const { colors, isDark, isLoading } = useTheme();

    if (isLoading || !colors) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
                <Text>Chargement...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#0F172A'] : ['#EFF6FF', '#FFFFFF']}
                    className="items-center justify-center pt-12 pb-12 px-6"
                    style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
                >
                    <Image
                        source={LogoImage}
                        className="w-20 h-20"
                        resizeMode="contain"
                    />

                    <Text className="text-3xl font-bold text-center mb-2" style={{ color: colors.text }}>
                        BudgetFlow
                    </Text>
                    <Text className="text-base text-center px-6" style={{ color: colors.textSecondary }}>
                        Gérez votre budget simplement et efficacement
                    </Text>
                </LinearGradient>

                <View className="px-4 pt-6 pb-4">
                    <Text className="text-xl font-semibold mb-4 px-2" style={{ color: colors.text }}>
                        Fonctionnalités principales
                    </Text>

                    <View className="space-y-3">
                        {features.map((feature, index) => (
                            <TouchableOpacity
                                key={index}
                                className="flex-row items-center p-4 rounded-xl mx-2"
                                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                                activeOpacity={0.7}
                            >
                                <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${colors.primary}15` }}>
                                    <Text style={{ fontSize: 24, color: colors.primary }}>{feature.icon}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-semibold text-base mb-0.5" style={{ color: colors.text }}>
                                        {feature.title}
                                    </Text>
                                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                        {feature.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Section Pied de page - Crédits */}
                <Footer/>
            </ScrollView>
        </SafeAreaView>
    );
};

const features = [
    { icon: '💰', title: 'Gestion des budgets', description: 'Créez et gérez vos budgets personnalisés' },
    { icon: '📊', title: 'Tableau de bord', description: 'Visualisez vos dépenses en temps réel' },
    { icon: '🌓', title: 'Thème clair/sombre', description: 'Adaptez l\'app à votre préférence' },
];

export default Index;