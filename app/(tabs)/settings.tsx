// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetData } from '@/hooks/use-budget-data';
import { useCurrency } from '@/hooks/use-currency';
import { storageService } from '@/hooks/use-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CustomModal } from '@/components/custom-modal';
import {Footer} from "@/components/Footer";
import i18, {changeLanguage} from "@/i18";
import {useTranslation} from "react-i18next";

const Settings = () => {
    const { t } = useTranslation();
    const { colors, isDark, toggleTheme } = useTheme();
    const { refreshData, isLoading: dataLoading } = useBudgetData();
    const { currency, setCurrencyCode, getCurrenciesList, isLoading: currencyLoading } = useCurrency();
    const [isResetting, setIsResetting] = useState(false);
    const [notification, setNotification] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'error' | 'warning' | 'info',
    });

    const showNotification = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        setNotification({ visible: true, title, message, type });
    };

    const handleResetAllData = () => {
        Alert.alert(
            t('settings.reset_all'),
            t('alerts.reset_all_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.reset_all'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.clearAll();
                            await refreshData();
                            showNotification(t('common.success'), t('alerts.reset_success'), 'success');
                        } catch (err) {
                            showNotification(t('common.error'), 'Unable to reset data', 'error');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleResetBudgetsOnly = () => {
        Alert.alert(
            t('settings.delete_budgets'),
            t('alerts.delete_budgets_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.removeItem('budgets');
                            await refreshData();
                            showNotification(t('common.success'), t('alerts.delete_budgets_success'), 'success');
                        } catch (err) {
                            showNotification(t('common.error'), 'Unable to delete budgets', 'error');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleResetTransactionsOnly = () => {
        Alert.alert(
            t('settings.delete_transactions'),
            t('alerts.delete_transactions_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.removeItem('transactions');
                            await refreshData();
                            showNotification(t('common.success'), t('alerts.delete_transactions_success'), 'success');
                        } catch (err) {
                            showNotification(t('common.error'), 'Unable to reset data', 'error');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    if (dataLoading || isResetting || currencyLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" style={{ backgroundColor: colors.background }}>
            <View className="px-6 pt-6 pb-8">
                {/* Section Apparence */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{ t('settings.appearance') }</Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <View className="flex-row items-center justify-between p-4">
                            <View>
                                <Text className="font-medium" style={{ color: colors.text }}>{ t('settings.dark_mode') }</Text>
                                <Text className="text-sm" style={{ color: colors.textSecondary }}>{ t('settings.dark_mode_desc') }</Text>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={isDark ? colors.primary : colors.textSecondary}
                            />
                        </View>
                    </View>
                </View>

                {/* Section Langue */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
                        {t('settings.language')}
                    </Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity
                            onPress={() => changeLanguage('fr')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View>
                                <Text className="font-medium" style={{ color: colors.text }}>Français</Text>
                                <Text className="text-sm" style={{ color: colors.textSecondary }}>Français</Text>
                            </View>
                            {i18.language === 'fr' && <MaterialIcons name="check-circle" size={24} color={colors.primary} />}
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity
                            onPress={() => changeLanguage('en')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View>
                                <Text className="font-medium" style={{ color: colors.text }}>English</Text>
                                <Text className="text-sm" style={{ color: colors.textSecondary }}>English</Text>
                            </View>
                            {i18.language === 'en' && <MaterialIcons name="check-circle" size={24} color={colors.primary} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section Devise */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{ t('settings.currency') }</Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        {getCurrenciesList().map((curr, index) => (
                            <React.Fragment key={curr.code}>
                                <TouchableOpacity onPress={() => setCurrencyCode(curr.code)} className="flex-row items-center justify-between p-4">
                                    <View>
                                        <Text className="font-medium" style={{ color: colors.text }}>{curr.name} ({curr.symbol})</Text>
                                        <Text className="text-sm" style={{ color: colors.textSecondary }}>{curr.code}</Text>
                                    </View>
                                    {currency === curr.code && <MaterialIcons name="check-circle" size={24} color={colors.primary} />}
                                </TouchableOpacity>
                                {index < getCurrenciesList().length - 1 && <View className="h-px" style={{ backgroundColor: colors.border }} />}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Section Données */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{ t('settings.data') }</Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity onPress={handleResetTransactionsOnly} className="p-4">
                            <Text className="font-medium" style={{ color: colors.warning || '#F59E0B' }}>{ t('settings.delete_transactions') }</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{ t('settings.delete_transactions_desc') }</Text>
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity onPress={handleResetBudgetsOnly} className="p-4">
                            <Text className="font-medium" style={{ color: colors.warning || '#F59E0B' }}>{ t('settings.delete_budgets') }</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{ t('settings.delete_budgets_desc') }</Text>
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity onPress={handleResetAllData} className="p-4">
                            <Text className="font-medium" style={{ color: colors.error }}>{ t('settings.reset_all') }</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{ t('settings.reset_all_desc') }</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Version et Crédits */}
                <View className="items-center pt-4">
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>Version 1.0.0</Text>
                </View>
                {/* Section Pied de page - Crédits */}
                <Footer/>
            </View>

            <CustomModal
                visible={notification.visible}
                title={notification.title}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, visible: false })}
            />
        </ScrollView>
    );
};

export default Settings;