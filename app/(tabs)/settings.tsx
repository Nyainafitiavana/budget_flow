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

const Settings = () => {
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
            'Réinitialiser toutes les données',
            'Cette action va supprimer tous vos comptes, budgets et transactions.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Réinitialiser',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.clearAll();
                            await refreshData();
                            showNotification('Succès', 'Toutes les données ont été réinitialisées', 'success');
                        } catch (err) {
                            showNotification('Erreur', 'Impossible de réinitialiser les données', 'error');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleResetAccountsOnly = () => {
        Alert.alert(
            'Supprimer les comptes',
            'Cette action va supprimer tous vos comptes.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.removeItem('accounts');
                            await refreshData();
                            showNotification('Succès', 'Comptes supprimés', 'success');
                        } catch (err) {
                            console.log(err);
                            showNotification('Erreur', 'Impossible de supprimer les comptes', 'error');
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
            'Supprimer les budgets',
            'Cette action va supprimer tous vos budgets.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.removeItem('budgets');
                            await refreshData();
                            showNotification('Succès', 'Budgets supprimés', 'success');
                        } catch (err) {
                            showNotification('Erreur', 'Impossible de supprimer les budgets', 'error');
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
            'Supprimer les transactions',
            'Cette action va supprimer tout l\'historique des transactions.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            await storageService.removeItem('transactions');
                            await refreshData();
                            showNotification('Succès', 'Transactions supprimées', 'success');
                        } catch (err) {
                            showNotification('Erreur', 'Impossible de supprimer les transactions', 'error');
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
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Apparence</Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <View className="flex-row items-center justify-between p-4">
                            <View>
                                <Text className="font-medium" style={{ color: colors.text }}>Mode sombre</Text>
                                <Text className="text-sm" style={{ color: colors.textSecondary }}>Activer le thème sombre</Text>
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

                {/* Section Devise */}
                <View className="mb-8">
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Devise</Text>
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
                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Données</Text>
                    <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity onPress={handleResetTransactionsOnly} className="p-4">
                            <Text className="font-medium" style={{ color: colors.warning || '#F59E0B' }}>Supprimer les transactions</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Supprimer uniquement l&#39;historique</Text>
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity onPress={handleResetBudgetsOnly} className="p-4">
                            <Text className="font-medium" style={{ color: colors.warning || '#F59E0B' }}>Supprimer les budgets</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Supprimer uniquement les budgets</Text>
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity onPress={handleResetAccountsOnly} className="p-4">
                            <Text className="font-medium" style={{ color: colors.warning || '#F59E0B' }}>Supprimer les comptes</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Supprimer uniquement les comptes</Text>
                        </TouchableOpacity>
                        <View className="h-px" style={{ backgroundColor: colors.border }} />
                        <TouchableOpacity onPress={handleResetAllData} className="p-4">
                            <Text className="font-medium" style={{ color: colors.error }}>🗑️ Réinitialiser toutes les données</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Supprimer tout</Text>
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