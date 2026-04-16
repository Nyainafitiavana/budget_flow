// app/(tabs)/budgets.tsx - Version corrigée pour handleAlimenterBudget
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetData } from '@/hooks/use-budget-data';
import { useCurrency } from '@/hooks/use-currency';
import { useAppDispatch } from '@/store/hooks';
import { updateAccountBalance, updateBudgetSpent, addTransaction, addBudget, deleteBudget } from '@/store/slices/data.slice';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {useTranslation} from "react-i18next";

const Budgets = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { budgets, accounts, transactions, refreshData, isLoading } = useBudgetData();
    const { formatAmount } = useCurrency();
    const dispatch = useAppDispatch();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'alimenter' | 'depense' | 'transferToSavings' | 'history' | null>(null);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [budgetName, setBudgetName] = useState('');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetColor, setBudgetColor] = useState('#3B82F6');
    const [loading, setLoading] = useState(false);

    const cashAccount = accounts.find(a => a.type === 'cash');
    const savingsAccount = accounts.find(a => a.type === 'savings');
    const hasCash = cashAccount && cashAccount.balance > 0;

    const colorsList = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'
    ];

    const getBudgetTotals = (budget: any) => {
        if (!budget) return { totalReel: 0, depenses: 0, solde: 0, pourcentage: 0 };
        let totalReel = budget.amount;
        let depenses = 0;
        if (budget.spent < 0) {
            totalReel = budget.amount + Math.abs(budget.spent);
            depenses = 0;
        } else {
            totalReel = budget.amount;
            depenses = budget.spent;
        }
        const solde = totalReel - depenses;
        const pourcentage = totalReel > 0 ? (depenses / totalReel) * 100 : 0;
        return { totalReel, depenses, solde, pourcentage };
    };

    const getBudgetTransactions = (budgetId: string) => {
        return transactions
            .filter(t => t.budgetId === budgetId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const getTransactionIcon = (operation: string) => {
        switch (operation) {
            case 'Alimentation': return { name: 'arrow-downward', color: '#10B981' };
            case 'Dépense': return { name: 'arrow-upward', color: '#EF4444' };
            case 'Transfert': return { name: 'swap-horiz', color: '#F59E0B' };
            default: return { name: 'receipt', color: '#6B7280' };
        }
    };

    const resetModal = () => {
        setModalVisible(false);
        setModalType(null);
        setSelectedBudget(null);
        setAmount('');
        setDescription('');
    };

    const handleAddBudget = async () => {
        const numAmount = parseFloat(budgetAmount);
        if (!budgetName.trim()) {
            Alert.alert(t('alerts.error'), t('alerts.budget_name_required'));
            return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('alerts.error'), t('alerts.invalid_amount'));
            return;
        }

        // Vérifier le solde espèces avant
        if (!cashAccount || cashAccount.balance < numAmount) {
            Alert.alert(
                t('alerts.error'),
                t('alerts.insufficient_cash', {amount: formatAmount(cashAccount?.balance || 0) })
            );
            return;
        }

        setLoading(true);
        try {
            // Le dispatch addBudget va maintenant aussi diminuer les espèces
            await dispatch(addBudget({
                name: budgetName,
                amount: numAmount,
                color: budgetColor,
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            })).unwrap();

            await refreshData();
            resetModal();
            setBudgetName('');
            setBudgetAmount('');
            Alert.alert(
                t('alerts.budget_created', { name: budgetName, amount: formatAmount(numAmount) })
            );
        } catch (error: any) {
            Alert.alert(t('alerts.error'), error.message);
        } finally {
            setLoading(false);
        }
    };

    // CORRECTION PRINCIPALE ICI
    const handleAlimenterBudget = async () => {
        if (!selectedBudget) {
            Alert.alert(t('alerts.error'), 'Budget non sélectionné');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('alerts.error'), t('alerts.invalid_amount'));
            return;
        }

        if (!cashAccount || cashAccount.balance < numAmount) {
            Alert.alert(
                t('alerts.error'),
                t('alerts.insufficient_cash', {amount: formatAmount(cashAccount?.balance || 0)})
            );
            return;
        }

        setLoading(true);
        try {
            // 1. Diminuer les espèces
            const newCashBalance = cashAccount.balance - numAmount;
            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: newCashBalance
            })).unwrap();

            // 2. Modifier le budget (spent devient plus négatif pour augmenter le budget)
            const currentSpent = selectedBudget.spent;
            const newSpent = currentSpent - numAmount;
            await dispatch(updateBudgetSpent({
                budgetId: selectedBudget.id,
                amount: newSpent - currentSpent
            })).unwrap();

            // 3. Ajouter la transaction
            await dispatch(addTransaction({
                type: 'income',
                operation: 'Alimentation',
                source: 'cash',
                destination: 'budget',
                budgetId: selectedBudget.id,
                amount: numAmount,
                description: description || t('transaction.top_up', {field: 'budget', name: selectedBudget.name}),
                date: new Date(),
            })).unwrap();

            // 4. Recharger les données
            await refreshData();

            resetModal();
            Alert.alert(t('common.success'), t('alerts.budget_topped_up', {amount: formatAmount(numAmount), name: selectedBudget.name}));
        } catch (error: any) {
            console.error(' Erreur:', error);
            Alert.alert(t('alerts.error'), error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDepense = async () => {
        if (!selectedBudget) {
            Alert.alert(t('alerts.error'), 'Budget non sélectionné');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('alerts.error'), t('alerts.invalid_amount'));
            return;
        }
        const { solde } = getBudgetTotals(selectedBudget);
        if (solde < numAmount) {
            Alert.alert(t('alerts.error'), t('alerts.insufficient_budget', {amount: formatAmount(solde)}))
            return;
        }

        setLoading(true);
        try {
            const currentSpent = selectedBudget.spent;
            const newSpent = currentSpent + numAmount;
            await dispatch(updateBudgetSpent({
                budgetId: selectedBudget.id,
                amount: newSpent - currentSpent
            })).unwrap();

            await dispatch(addTransaction({
                type: 'expense',
                operation: 'Dépense',
                source: 'budget',
                destination: '',
                budgetId: selectedBudget.id,
                amount: numAmount,
                description: description.trim() || t('budgets.spent_from', {name: selectedBudget.name}),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), `${formatAmount(numAmount)}` + t('budgets.spent_from', {name: selectedBudget.name}));
        } catch (error: any) {
            Alert.alert(t('alerts.error'), error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransferToSavings = async () => {
        if (!selectedBudget) {
            Alert.alert(t('alerts.error'), 'Budget non sélectionné');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('alerts.error'), t('alerts.invalid_amount'));
            return;
        }
        const { solde } = getBudgetTotals(selectedBudget);
        if (solde < numAmount) {
            Alert.alert(t('alerts.error'), t('alerts.insufficient_budget', {amount: formatAmount(solde)}));
            return;
        }

        setLoading(true);
        try {
            const currentSpent = selectedBudget.spent;
            const newSpent = currentSpent + numAmount;
            await dispatch(updateBudgetSpent({
                budgetId: selectedBudget.id,
                amount: newSpent - currentSpent
            })).unwrap();

            if (savingsAccount) {
                await dispatch(updateAccountBalance({
                    accountId: savingsAccount.id,
                    newBalance: savingsAccount.balance + numAmount
                })).unwrap();
            }

            await dispatch(addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'budget',
                destination: 'savings',
                budgetId: selectedBudget.id,
                amount: numAmount,
                description: description || t('budgets.transfer_to_savings_from', {name: selectedBudget.name}),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('alerts.budget_transferred', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('alerts.error'), error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBudget = (budget: any) => {
        // Calculer le solde restant pour l'afficher dans la confirmation
        let soldeRestant = budget.amount - budget.spent;
        if (budget.spent < 0) {
            soldeRestant = budget.amount + Math.abs(budget.spent);
        }

        const message = soldeRestant > 0
            ? t('alerts.delete_budget_confirm', {name: budget.name}) + '\n\n' + t('alerts.delete_budget_with_refund', {amount: formatAmount(soldeRestant)})
            : t('alerts.delete_budget_confirm', {name: budget.name}) + '\n\n' + t('alerts.delete_budget_no_refund');

        Alert.alert(
            t('alerts.delete_budget'),
            message,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text:  t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            // Appeler deleteBudget avec remboursement automatique
                            await dispatch(deleteBudget(budget.id)).unwrap();
                            await refreshData();
                            const successMessage = soldeRestant > 0
                                ? `${t('alerts.delete_budget_success', { name: budget.name })} ${t('alerts.delete_budget_refund', { amount: formatAmount(soldeRestant) })}`
                                : t('alerts.delete_budget_success', { name: budget.name });

                            Alert.alert(t('common.success'), successMessage);
                        } catch (error: any) {
                            Alert.alert(t('alerts.error'), error.message);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const HistoryModal = () => {
        if (!selectedBudget) return null;
        const budgetTransactions = getBudgetTransactions(selectedBudget.id);
        const { totalReel, depenses, solde } = getBudgetTotals(selectedBudget);

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible && modalType === 'history'}
                onRequestClose={resetModal}
            >
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background, maxHeight: '80%' }}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold" style={{ color: colors.text }}>{t('budgets.history')} - {selectedBudget.name} </Text>
                            <TouchableOpacity onPress={resetModal}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between mb-4 p-3 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('budgets.total')}</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.primary }}>{formatAmount(totalReel)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('budgets.spent')}</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.error }}>{formatAmount(depenses)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('budgets.current_balance')}</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.success }}>{formatAmount(solde)}</Text>
                            </View>
                        </View>

                        {budgetTransactions.length === 0 ? (
                            <View className="items-center py-8">
                                <MaterialIcons name="history" size={50} color={colors.textSecondary} />
                                <Text className="text-center mt-3" style={{ color: colors.textSecondary }}>{t('budgets.no_transactions')}</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={budgetTransactions}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const icon = getTransactionIcon(item.operation);
                                    const isEntree = item.operation === 'Alimentation';
                                    const isSortie = item.operation === 'Dépense' || item.operation === 'Transfert';
                                    return (
                                        <View className="flex-row items-center justify-between p-3 mb-2 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                                            <View className="flex-row items-center flex-1">
                                                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${icon.color}15` }}>
                                                    <MaterialIcons name={icon.name as any} size={20} color={icon.color} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-semibold" style={{ color: colors.text }}>{item.operation}</Text>
                                                    <Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>{item.description}</Text>
                                                    <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{formatDate(item.date)}</Text>
                                                </View>
                                            </View>
                                            <Text className="font-bold" style={{ color: isEntree ? colors.success : isSortie ? colors.error : colors.warning }}>
                                                {isEntree ? '+' : '-'} {formatAmount(item.amount)}
                                            </Text>
                                        </View>
                                    );
                                }}
                            />
                        )}
                        <TouchableOpacity onPress={resetModal} className="mt-4 p-3 rounded-xl" style={{ backgroundColor: colors.primary }}>
                            <Text className="text-white text-center font-semibold">{t('budgets.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderAddModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'add'} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('budgets.new_budget')}</Text>
                    <TextInput placeholder={t('budgets.budget_name')} placeholderTextColor={colors.textSecondary} value={budgetName} onChangeText={setBudgetName} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TextInput placeholder={t('budgets.initial_amount')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={budgetAmount} onChangeText={setBudgetAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <Text className="text-sm mb-2" style={{ color: colors.text }}>{t('budgets.color')}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row space-x-2">
                            {colorsList.map((color) => (
                                <TouchableOpacity key={color} onPress={() => setBudgetColor(color)} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: color, borderWidth: budgetColor === color ? 3 : 0, borderColor: 'white' }}>
                                    {budgetColor === color && <MaterialIcons name="check" size={16} color="white" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                    <TouchableOpacity onPress={handleAddBudget} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? t('common.loading') : t('budgets.create')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderAlimenterModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'alimenter' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>{t('budgets.top_up_budget')}</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.success }}>{t('budgets.available_cash_info')}: {formatAmount(cashAccount?.balance || 0)}</Text>
                    <TextInput placeholder={t('budgets.amount_to_add')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder={t('budgets.description_optional')} placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleAlimenterBudget} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? t('common.loading') : t('budgets.top_up')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderDepenseModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'depense' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>{t('budgets.spend')}</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.warning }}>{t('budgets.current_balance_info')}: {formatAmount(getBudgetTotals(selectedBudget).solde)}</Text>
                    <TextInput placeholder={t('budgets.expense_amount')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder={t('budgets.description_optional')} placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleDepense} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.error, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? t('common.loading') : t('budgets.spend')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderTransferModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'transferToSavings' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>{t('budgets.transfer_to_savings')}</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.success }}>{t('budgets.current_balance_info')}: {formatAmount(getBudgetTotals(selectedBudget).solde)}</Text>
                    <TextInput placeholder={t('budgets.amount_to_transfer')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder={t('budgets.description_optional')} placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleTransferToSavings} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.success, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? t('common.loading') : t('budgets.transfer')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

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
                <View className="mx-4 mt-4 p-4 rounded-xl" style={{ backgroundColor: `${colors.primary}10` }}>
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>{t('budgets.available_cash')}</Text>
                            <Text className="text-2xl font-bold" style={{ color: colors.primary }}>{formatAmount(cashAccount?.balance || 0)}</Text>
                        </View>
                        <MaterialIcons name="attach-money" size={40} color={colors.primary} />
                    </View>
                </View>

                <View className="flex-row justify-between items-center px-4 pt-6 mb-4">
                    <Text className="text-xl font-semibold" style={{ color: colors.text }}>{t('budgets.my_budgets')}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setModalType('add');
                            setBudgetName('');
                            setBudgetAmount('');
                            setBudgetColor('#3B82F6');
                            setModalVisible(true);
                        }}
                        disabled={!hasCash}
                        className="flex-row items-center px-4 py-2 rounded-full"
                        style={{
                            backgroundColor: !hasCash ? colors.textSecondary : colors.primary,
                            opacity: !hasCash ? 0.5 : 1
                        }}
                    >
                        <MaterialIcons name="add" size={20} color="white" />
                        <Text className="text-white font-semibold ml-1">{t('budgets.add')}</Text>
                    </TouchableOpacity>
                </View>

                {!hasCash && (
                    <View className="mx-4 mb-4 p-3 rounded-xl" style={{ backgroundColor: `${colors.warning}15`, borderWidth: 1, borderColor: `${colors.warning}30` }}>
                        <View className="flex-row items-center">
                            <MaterialIcons name="info" size={20} color={colors.warning} />
                            <Text className="text-sm ml-2 flex-1" style={{ color: colors.textSecondary }}>
                                {t('budgets.add_cash_hint')}
                            </Text>
                        </View>
                    </View>
                )}

                {budgets.filter(b => !b.isClosed).length === 0 ? (
                    <View className="mx-4 p-8 rounded-xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <MaterialIcons name="account-balance-wallet" size={50} color={colors.textSecondary} />
                        <Text className="text-center mt-3" style={{ color: colors.textSecondary }}>{t('budgets.no_budget')}</Text>
                        <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>{t('budgets.add_budget_hint')}</Text>
                    </View>
                ) : (
                    budgets.filter(b => !b.isClosed).map((budget) => {
                        const { totalReel, depenses, solde, pourcentage } = getBudgetTotals(budget);
                        return (
                            <View key={budget.id} className="mx-4 p-4 mb-3 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                                <View className="flex-row justify-between items-center mb-3">
                                    <View className="flex-row items-center flex-1">
                                        <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: budget.color }} />
                                        <Text className="font-semibold text-base" style={{ color: colors.text }}>{budget.name}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('history'); setModalVisible(true); }} className="mr-3 p-1">
                                            <MaterialIcons name="history" size={22} color={colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteBudget(budget)}>
                                            <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View className="mb-2">
                                    <Text className="text-sm" style={{ color: colors.textSecondary }}>{t('budgets.current_balance')}</Text>
                                    <Text className="text-2xl font-bold" style={{ color: budget.color }}>{formatAmount(solde)}</Text>
                                </View>

                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('budgets.total')}: {formatAmount(totalReel)}</Text>
                                    <Text className="text-xs" style={{ color: colors.error }}>{t('budgets.spent')}: {formatAmount(depenses)}</Text>
                                </View>

                                <View className="mt-1">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('budgets.usage')}</Text>
                                        <Text className="text-xs font-medium" style={{ color: budget.color }}>{pourcentage.toFixed(0)}%</Text>
                                    </View>
                                    <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                                        <View className="h-full rounded-full" style={{ width: `${Math.min(pourcentage, 100)}%`, backgroundColor: budget.color }} />
                                    </View>
                                </View>

                                <View className="flex-row flex-wrap gap-2 mt-4">
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('alimenter'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                        <MaterialIcons name="add" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">{t('budgets.top_up')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('depense'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.error }}>
                                        <MaterialIcons name="shopping-cart" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">{t('budgets.spend')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('transferToSavings'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.success }}>
                                        <MaterialIcons name="savings" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">{t('budgets.to_savings')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
                <View className="h-8" />
            </ScrollView>

            {renderAddModal()}
            {renderAlimenterModal()}
            {renderDepenseModal()}
            {renderTransferModal()}
            <HistoryModal />
        </SafeAreaView>
    );
};

export default Budgets;