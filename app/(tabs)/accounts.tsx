import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetData } from '@/hooks/use-budget-data';
import { useCurrency } from '@/hooks/use-currency';
import { useAppDispatch } from '@/store/hooks';
import { updateAccountBalance, addTransaction } from '@/store/slices/data.slice';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Account } from '@/types';
import {useTranslation} from "react-i18next";

type ModalType = 'ALIMENT-BANK' | 'BANK-TO-ESPECE' | 'ESPECE-TO-EPARGNE' | 'EPARGNE-TO-ESPECE';

const Accounts = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { accounts, refreshData, isLoading } = useBudgetData();
    const { formatAmount } = useCurrency();
    const dispatch = useAppDispatch();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<ModalType | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const bankAccount = accounts.find((a: Account) => a.type === 'bank');
    const cashAccount = accounts.find((a: Account) => a.type === 'cash');
    const savingsAccount = accounts.find((a: Account) => a.type === 'savings');

    const resetModal = useCallback(() => {
        setModalVisible(false);
        setModalType(null);
        setAmount('');
    }, []);

    // 1. Alimenter la banque (extérieur → banque)
    const handleAlimenterBanque = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!bankAccount) {
            Alert.alert(t('common.error'), 'Aucun compte bancaire trouvé');
            return;
        }

        setLoading(true);
        try {
            await dispatch(updateAccountBalance({
                accountId: bankAccount.id,
                newBalance: bankAccount.balance + numAmount
            })).unwrap();

            await dispatch(addTransaction({
                type: 'income',
                operation: 'Alimentation',
                source: 'external',
                destination: 'bank',
                amount: numAmount,
                description: t('accounts.top_up_from'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('accounts.added_to_bank', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, bankAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 2. Banque → Espèces
    const handleBankToCash = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!bankAccount || !cashAccount) {
            Alert.alert(t('common.error'), 'Comptes non trouvés');
            return;
        }
        if (bankAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('common_errors.insufficient_bank_balance'));
            return;
        }

        setLoading(true);
        try {
            // Diminuer la banque
            await dispatch(updateAccountBalance({
                accountId: bankAccount.id,
                newBalance: bankAccount.balance - numAmount
            })).unwrap();

            // Augmenter les espèces
            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: cashAccount.balance + numAmount
            })).unwrap();

            await dispatch(addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'bank',
                destination: 'cash',
                amount: numAmount,
                description: t('accounts.transfer_bank_to_cash'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('alerts.success_transfer_to_cash', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, bankAccount, cashAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 3. Espèces → Épargne
    const handleCashToEpargne = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!cashAccount || !savingsAccount) {
            Alert.alert(t('common.error'), 'Comptes non trouvés');
            return;
        }
        if (cashAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('alerts.insufficient_cash', {amount: formatAmount(cashAccount.balance)}));
            return;
        }

        setLoading(true);
        try {
            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: cashAccount.balance - numAmount
            })).unwrap();

            await dispatch(updateAccountBalance({
                accountId: savingsAccount.id,
                newBalance: savingsAccount.balance + numAmount
            })).unwrap();

            await dispatch(addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'cash',
                destination: 'savings',
                amount: numAmount,
                description: t('accounts.cash_to_savings'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('alerts.budget_transferred', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, cashAccount, savingsAccount, t, formatAmount, dispatch, refreshData, resetModal]);

    // 4. Épargne → Espèces
    const handleSavingsToCash = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!savingsAccount || !cashAccount) {
            Alert.alert(t('common.error'), 'Comptes non trouvés');
            return;
        }
        if (savingsAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('alerts.insufficient_saving', {amount: formatAmount(savingsAccount.balance)}));
            return;
        }

        setLoading(true);
        try {
            await dispatch(updateAccountBalance({
                accountId: savingsAccount.id,
                newBalance: savingsAccount.balance - numAmount
            })).unwrap();

            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: cashAccount.balance + numAmount
            })).unwrap();

            await dispatch(addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'savings',
                destination: 'cash',
                amount: numAmount,
                description: t('accounts.withdrawal_savings_to_cash'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('alerts.transferred_from_savings', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, savingsAccount, cashAccount, t, formatAmount, dispatch, refreshData, resetModal]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Compte Bancaire */}
                <View className="mx-4 mt-4 p-5 rounded-2xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <View className="flex-row items-center mb-3">
                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${colors.primary}15` }}>
                            <MaterialIcons name="account-balance" size={24} color={colors.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-semibold" style={{ color: colors.text }}>{ t('accounts.bank_account') }</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{bankAccount?.bankName || 'Banque'}</Text>
                        </View>
                        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                            {formatAmount(bankAccount?.balance || 0)}
                        </Text>
                    </View>

                    <View className="flex-row space-x-3 mt-2">
                        <TouchableOpacity
                            onPress={() => {
                                setModalType('ALIMENT-BANK');
                                setAmount('');
                                setModalVisible(true);
                            }}
                            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <MaterialIcons name="add" size={20} color="white" />
                            <Text className="text-white font-semibold ml-1">{ t('accounts.top_up') }</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setModalType('BANK-TO-ESPECE');
                                setAmount('');
                                setModalVisible(true);
                            }}
                            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: colors.secondary || '#3B82F6', opacity: 0.8 }}
                        >
                            <MaterialIcons name="swap-horiz" size={20} color="white" />
                            <Text className="text-white font-semibold ml-1">{ t('accounts.to_cash') }</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Espèces */}
                <View className="mx-4 mt-4 p-5 rounded-2xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <View className="flex-row items-center mb-3">
                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${colors.success}15` }}>
                            <MaterialIcons name="attach-money" size={24} color={colors.success} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-semibold" style={{ color: colors.text }}>Espèces</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Liquide disponible</Text>
                        </View>
                        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                            {formatAmount(cashAccount?.balance || 0)}
                        </Text>
                    </View>

                    <View className="flex-row space-x-3 mt-2">
                        <TouchableOpacity
                            onPress={() => {
                                setModalType('ESPECE-TO-EPARGNE');
                                setAmount('');
                                setModalVisible(true);
                            }}
                            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: colors.warning || '#F59E0B' }}
                        >
                            <MaterialIcons name="savings" size={20} color="white" />
                            <Text className="text-white font-semibold ml-1">Espèces → Épargne</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-3 p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}10` }}>
                        <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
                            💡 { t('accounts.cash_info') }
                        </Text>
                    </View>
                </View>

                {/* Épargne */}
                <View className="mx-4 mt-4 p-5 rounded-2xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <View className="flex-row items-center mb-3">
                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${colors.success}15` }}>
                            <MaterialIcons name="savings" size={24} color={colors.success} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-semibold" style={{ color: colors.text }}>{ t('accounts.savings') }</Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{ t('accounts.savings_info') }</Text>
                        </View>
                        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                            {formatAmount(savingsAccount?.balance || 0)}
                        </Text>
                    </View>

                    <View className="flex-row space-x-3 mt-2">
                        <TouchableOpacity
                            onPress={() => {
                                setModalType('EPARGNE-TO-ESPECE');
                                setAmount('');
                                setModalVisible(true);
                            }}
                            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: colors.success }}
                        >
                            <MaterialIcons name="arrow-upward" size={20} color="white" />
                            <Text className="text-white font-semibold ml-1">Épargne → Espèces</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={resetModal}
                >
                    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                                {modalType === 'ALIMENT-BANK' && t('accounts.top_up_bank') }
                                {modalType === 'BANK-TO-ESPECE' && t('accounts.transfer_bank_to_cash')}
                                {modalType === 'ESPECE-TO-EPARGNE' && t('accounts.transfer_cash_to_savings')}
                                {modalType === 'EPARGNE-TO-ESPECE' && t('accounts.transfer_savings_to_cash')}
                            </Text>

                            <TextInput
                                placeholder={ t('accounts.amount') }
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                className="p-3 rounded-xl mb-4"
                                style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }}
                            />

                            {modalType === 'ALIMENT-BANK' && (
                                <TouchableOpacity
                                    onPress={handleAlimenterBanque}
                                    disabled={loading}
                                    className="p-3 rounded-xl mb-2"
                                    style={{ backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {loading ? t('common.loading') :  t('accounts.top_up_bank') }
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {modalType === 'BANK-TO-ESPECE' && (
                                <TouchableOpacity
                                    onPress={handleBankToCash}
                                    disabled={loading}
                                    className="p-3 rounded-xl mb-2"
                                    style={{ backgroundColor: colors.secondary, opacity: loading ? 0.7 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {loading ? t('common.loading') : t('accounts.transfer_bank_to_cash')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {modalType === 'ESPECE-TO-EPARGNE' && (
                                <TouchableOpacity
                                    onPress={handleCashToEpargne}
                                    disabled={loading}
                                    className="p-3 rounded-xl mb-2"
                                    style={{ backgroundColor: colors.warning, opacity: loading ? 0.7 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {loading ? t('common.loading') : t('accounts.transfer_cash_to_savings')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {modalType === 'EPARGNE-TO-ESPECE' && (
                                <TouchableOpacity
                                    onPress={handleSavingsToCash}
                                    disabled={loading}
                                    className="p-3 rounded-xl mb-2"
                                    style={{ backgroundColor: colors.success, opacity: loading ? 0.7 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {loading ? t('common.loading') : t('accounts.transfer_savings_to_cash')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={resetModal}
                                className="p-3 rounded-xl"
                            >
                                <Text className="text-center" style={{ color: colors.textSecondary }}>{ t('common.cancel') }</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Accounts;