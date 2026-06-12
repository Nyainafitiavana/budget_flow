// app/(tabs)/accounts.tsx - Version avec dépense directe depuis la banque
import React, {useState, useCallback} from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import {useTheme} from '@/hooks/use-theme';
import {useBudgetData} from '@/hooks/use-budget-data';
import {useCurrency} from '@/hooks/use-currency';
import {useAppDispatch} from '@/store/hooks';
import {updateAccountBalance, addTransaction} from '@/store/slices/data.slice';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {Account, Transaction} from '@/types';
import {useTranslation} from "react-i18next";
import {budgetStorageService} from '@/services/storage.service';

type ModalType =
    'ALIMENT-BANK' |
    'BANK-TO-ESPECE' |
    'CASH-ALIMENT' |
    'ESPECE-TO-EPARGNE' |
    'EPARGNE-TO-ESPECE' |
    'BANK-EXPENSE' |
    'HISTORY';

const Accounts = () => {
    const {colors} = useTheme();
    const {t} = useTranslation();
    const {accounts, transactions, refreshData, isLoading} = useBudgetData();
    const {formatAmount} = useCurrency();
    const dispatch = useAppDispatch();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<ModalType | null>(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

    const bankAccount = accounts.find((a: Account) => a.type === 'bank');
    const cashAccount = accounts.find((a: Account) => a.type === 'cash');
    const savingsAccount = accounts.find((a: Account) => a.type === 'savings');

    const resetModal = useCallback(() => {
        setModalVisible(false);
        setModalType(null);
        setAmount('');
        setDescription('');
        setSelectedAccount(null);
    }, []);

    // Filtrer les transactions par compte
    const getAccountTransactions = (accountType: string): Transaction[] => {
        return transactions.filter(transaction => {
            switch (accountType) {
                case 'bank':
                    return transaction.source === 'bank' || transaction.destination === 'bank';
                case 'cash':
                    return transaction.source === 'cash' || transaction.destination === 'cash';
                case 'savings':
                    return transaction.source === 'savings' || transaction.destination === 'savings';
                default:
                    return false;
            }
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const getTransactionIcon = (transaction: Transaction) => {
        if (transaction.source === 'external') return {name: 'add-circle', color: '#10B981'};
        if (transaction.operation === 'Dépense') return {name: 'shopping-cart', color: '#EF4444'};
        if (transaction.destination === 'savings' && transaction.source === 'cash') return {
            name: 'savings',
            color: '#F59E0B'
        };
        if (transaction.source === 'savings' && transaction.destination === 'cash') return {
            name: 'arrow-downward',
            color: '#EF4444'
        };
        if (transaction.source === 'bank' && transaction.destination === 'cash') return {
            name: 'swap-horiz',
            color: '#3B82F6'
        };
        if (transaction.source === 'cash' && transaction.destination === 'bank') return {
            name: 'swap-horiz',
            color: '#3B82F6'
        };
        if (transaction.operation === 'Alimentation') return {name: 'add-circle', color: '#10B981'};
        return {name: 'receipt', color: '#6B7280'};
    };

    const getTransactionAmountColor = (transaction: Transaction, accountType: string) => {
        let isIncome = false;

        switch (accountType) {
            case 'bank':
                isIncome = transaction.destination === 'bank';
                break;
            case 'cash':
                isIncome = transaction.destination === 'cash';
                break;
            case 'savings':
                isIncome = transaction.destination === 'savings';
                break;
        }

        return isIncome ? '#10B981' : '#EF4444';
    };

    const getTransactionAmountPrefix = (transaction: Transaction, accountType: string) => {
        let isIncome = false;

        switch (accountType) {
            case 'bank':
                isIncome = transaction.destination === 'bank';
                break;
            case 'cash':
                isIncome = transaction.destination === 'cash';
                break;
            case 'savings':
                isIncome = transaction.destination === 'savings';
                break;
        }

        return isIncome ? '+' : '-';
    };

    const handleDeleteTransaction = async (transaction: Transaction) => {
        let message = '';

        if (transaction.operation === 'Alimentation') {
            message = t('alerts.delete_alimentation_confirm', {amount: formatAmount(transaction.amount)});
        } else if (transaction.operation === 'Dépense') {
            message = t('alerts.delete_expense_confirm_bank', {amount: formatAmount(transaction.amount)});
        } else if (transaction.operation === 'Transfert') {
            message = t('alerts.delete_transfer_confirm', {amount: formatAmount(transaction.amount)});
        } else {
            message = t('alerts.delete_transaction_confirm');
        }

        Alert.alert(
            t('alerts.delete_transaction'),
            message,
            [
                {text: t('common.cancel'), style: 'cancel'},
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const currentAccounts = accounts;

                            if (transaction.source === 'external' && transaction.destination === 'bank') {
                                const bank = currentAccounts.find(a => a.type === 'bank');
                                if (bank) {
                                    await budgetStorageService.updateAccountBalance(bank.id, bank.balance - transaction.amount);
                                }
                            } else if (transaction.operation === 'Dépense' && transaction.source === 'bank') {
                                // Suppression d'une dépense bancaire → le montant retourne à la banque
                                const bank = currentAccounts.find(a => a.type === 'bank');
                                if (bank) {
                                    await budgetStorageService.updateAccountBalance(bank.id, bank.balance + transaction.amount);
                                }
                            } else if (transaction.source === 'bank' && transaction.destination === 'cash') {
                                const bank = currentAccounts.find(a => a.type === 'bank');
                                const cash = currentAccounts.find(a => a.type === 'cash');
                                if (bank && cash) {
                                    await budgetStorageService.updateAccountBalance(bank.id, bank.balance + transaction.amount);
                                    await budgetStorageService.updateAccountBalance(cash.id, cash.balance - transaction.amount);
                                }
                            } else if (transaction.source === 'cash' && transaction.destination === 'savings') {
                                const cash = currentAccounts.find(a => a.type === 'cash');
                                const savings = currentAccounts.find(a => a.type === 'savings');
                                if (cash && savings) {
                                    await budgetStorageService.updateAccountBalance(cash.id, cash.balance + transaction.amount);
                                    await budgetStorageService.updateAccountBalance(savings.id, savings.balance - transaction.amount);
                                }
                            } else if (transaction.source === 'savings' && transaction.destination === 'cash') {
                                const savings = currentAccounts.find(a => a.type === 'savings');
                                const cash = currentAccounts.find(a => a.type === 'cash');
                                if (savings && cash) {
                                    await budgetStorageService.updateAccountBalance(savings.id, savings.balance + transaction.amount);
                                    await budgetStorageService.updateAccountBalance(cash.id, cash.balance - transaction.amount);
                                }
                            }

                            await budgetStorageService.deleteTransaction(transaction.id);
                            await refreshData();
                            Alert.alert(t('common.success'), t('alerts.delete_transaction_success'));
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
        if (!selectedAccount) return null;

        const accountTransactions = getAccountTransactions(selectedAccount.type);
        const accountName = selectedAccount.type === 'bank' ? t('accounts.bank_account') :
            selectedAccount.type === 'cash' ? t('accounts.cash') :
                t('accounts.savings');

        let totalIncome = 0;
        let totalExpense = 0;

        accountTransactions.forEach(transaction => {
            let isIncome = false;
            switch (selectedAccount.type) {
                case 'bank':
                    isIncome = transaction.destination === 'bank';
                    break;
                case 'cash':
                    isIncome = transaction.destination === 'cash';
                    break;
                case 'savings':
                    isIncome = transaction.destination === 'savings';
                    break;
            }

            if (isIncome) {
                totalIncome += transaction.amount;
            } else {
                totalExpense += transaction.amount;
            }
        });

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible && modalType === 'HISTORY'}
                onRequestClose={resetModal}
            >
                <View className="flex-1 justify-end" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <View className="rounded-t-3xl p-6" style={{backgroundColor: colors.background, maxHeight: '80%'}}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold" style={{color: colors.text}}>
                                {t('accounts.history')} - {accountName}
                            </Text>
                            <TouchableOpacity onPress={resetModal}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary}/>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between mb-4 p-3 rounded-xl"
                              style={{backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border}}>
                            <View>
                                <Text className="text-xs"
                                      style={{color: colors.textSecondary}}>{t('accounts.total_income')}</Text>
                                <Text className="text-lg font-bold"
                                      style={{color: colors.success}}>{formatAmount(totalIncome)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs"
                                      style={{color: colors.textSecondary}}>{t('accounts.total_expense')}</Text>
                                <Text className="text-lg font-bold"
                                      style={{color: colors.error}}>{formatAmount(totalExpense)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs"
                                      style={{color: colors.textSecondary}}>{t('accounts.net_flow')}</Text>
                                <Text className="text-lg font-bold"
                                      style={{color: totalIncome - totalExpense >= 0 ? colors.success : colors.error}}>
                                    {formatAmount(totalIncome - totalExpense)}
                                </Text>
                            </View>
                        </View>

                        {accountTransactions.length === 0 ? (
                            <View className="items-center py-8">
                                <MaterialIcons name="history" size={50} color={colors.textSecondary}/>
                                <Text className="text-center mt-3" style={{color: colors.textSecondary}}>
                                    {t('accounts.no_transactions')}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={accountTransactions}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                renderItem={({item}) => {
                                    const icon = getTransactionIcon(item);
                                    const amountColor = getTransactionAmountColor(item, selectedAccount.type);
                                    const prefix = getTransactionAmountPrefix(item, selectedAccount.type);

                                    return (
                                        <View className="flex-row items-center justify-between p-3 mb-2 rounded-xl"
                                              style={{
                                                  backgroundColor: colors.surface,
                                                  borderWidth: 1,
                                                  borderColor: colors.border
                                              }}>
                                            <View className="flex-row items-center flex-1">
                                                <View
                                                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                                    style={{backgroundColor: `${icon.color}15`}}>
                                                    <MaterialIcons name={icon.name as any} size={20}
                                                                   color={icon.color}/>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-semibold" style={{color: colors.text}}>
                                                        {item.operation === 'Alimentation' ? t('accounts.top_up') :
                                                            item.operation === 'Dépense' ? t('accounts.expense') :
                                                                item.operation === 'Transfert' ? t('accounts.transfer') :
                                                                    item.operation}
                                                    </Text>
                                                    <Text className="text-xs" style={{color: colors.textSecondary}}
                                                          numberOfLines={1}>
                                                        {item.description}
                                                    </Text>
                                                    <Text className="text-xs mt-0.5"
                                                          style={{color: colors.textSecondary}}>
                                                        {formatDate(item.date)}
                                                    </Text>
                                                    {item.source && item.destination && item.source !== 'external' && (
                                                        <Text className="text-xs mt-0.5"
                                                              style={{color: colors.textSecondary}}>
                                                            {t('accounts.from')}: {item.source === 'bank' ? t('accounts.bank_account') :
                                                            item.source === 'cash' ? t('accounts.cash') :
                                                                item.source === 'savings' ? t('accounts.savings') : item.source}
                                                            {' → '}
                                                            {t('accounts.to')}: {item.destination === 'bank' ? t('accounts.bank_account') :
                                                            item.destination === 'cash' ? t('accounts.cash') :
                                                                item.destination === 'savings' ? t('accounts.savings') : item.destination}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View className="flex-row items-center">
                                                <Text className="font-bold mr-3" style={{color: amountColor}}>
                                                    {prefix} {formatAmount(item.amount)}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteTransaction(item)}
                                                    className="p-2"
                                                >
                                                    <MaterialIcons name="delete-outline" size={20}
                                                                   color={colors.error}/>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                }}
                            />
                        )}

                        <TouchableOpacity onPress={resetModal} className="mt-4 p-3 rounded-xl"
                                          style={{backgroundColor: colors.primary}}>
                            <Text className="text-white text-center font-semibold">{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // 1. Alimenter la banque (extérieur → banque)
    const handleAlimenterBanque = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!bankAccount) {
            Alert.alert(t('common.error'), t('alerts.account_not_found'));
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
                description: description.trim() || t('accounts.top_up_from'),
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
    }, [amount, description, bankAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 2. Banque → Espèces
    const handleBankToCash = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!bankAccount || !cashAccount) {
            Alert.alert(t('common.error'), t('alerts.accounts_not_found'));
            return;
        }
        if (bankAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('common_errors.insufficient_bank_balance'));
            return;
        }

        setLoading(true);
        try {
            await budgetStorageService.updateAccountBalance(bankAccount.id, bankAccount.balance - numAmount);
            await budgetStorageService.updateAccountBalance(cashAccount.id, cashAccount.balance + numAmount);
            await budgetStorageService.addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'bank',
                destination: 'cash',
                amount: numAmount,
                description: description.trim() || t('accounts.transfer_bank_to_cash'),
                date: new Date(),
            });
            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), `${formatAmount(numAmount)} ${t('accounts.transferred_to_cash')}`);
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, description, bankAccount, cashAccount, formatAmount, refreshData, resetModal, t]);

    // 3. Dépense directe depuis la banque (achats en ligne, carte, etc.)
    const handleBankExpense = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!bankAccount) {
            Alert.alert(t('common.error'), t('alerts.account_not_found'));
            return;
        }
        if (bankAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('common_errors.insufficient_bank_balance'));
            return;
        }

        setLoading(true);
        try {
            // 1. Diminuer le solde de la banque
            await dispatch(updateAccountBalance({
                accountId: bankAccount.id,
                newBalance: bankAccount.balance - numAmount
            })).unwrap();

            // 2. Ajouter une transaction de dépense
            await dispatch(addTransaction({
                type: 'expense',
                operation: 'Dépense',
                source: 'bank',
                destination: '',
                amount: numAmount,
                description: description.trim() || t('accounts.bank_expense_description'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('accounts.bank_expense_success', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, description, bankAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 4. Alimenter le compte espèces (extérieur → espèces)
    const handleCashAliment = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!cashAccount) {
            Alert.alert(t('common.error'), t('alerts.account_not_found'));
            return;
        }

        setLoading(true);
        try {
            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: cashAccount.balance + numAmount
            })).unwrap();

            await dispatch(addTransaction({
                type: 'income',
                operation: 'Alimentation',
                source: 'external',
                destination: 'cash',
                amount: numAmount,
                description: description.trim() || t('accounts.cash_top_up_description'),
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('accounts.cash_top_up_success', { amount: formatAmount(numAmount) }));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, description, cashAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 5. Espèces → Épargne
    const handleCashToEpargne = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!cashAccount || !savingsAccount) {
            Alert.alert(t('common.error'), t('alerts.accounts_not_found'));
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
                description: description.trim() || t('accounts.cash_to_savings'),
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
    }, [amount, description, cashAccount, savingsAccount, dispatch, formatAmount, refreshData, resetModal, t]);

    // 6. Épargne → Espèces
    const handleSavingsToCash = useCallback(async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert(t('common.error'), t('alerts.invalid_amount'));
            return;
        }
        if (!savingsAccount || !cashAccount) {
            Alert.alert(t('common.error'), t('alerts.accounts_not_found'));
            return;
        }
        if (savingsAccount.balance < numAmount) {
            Alert.alert(t('common.error'), t('alerts.insufficient_saving', {amount: formatAmount(savingsAccount.balance)}));
            return;
        }

        setLoading(true);
        try {
            await budgetStorageService.updateAccountBalance(savingsAccount.id, savingsAccount.balance - numAmount);
            await budgetStorageService.updateAccountBalance(cashAccount.id, cashAccount.balance + numAmount);
            await budgetStorageService.addTransaction({
                type: 'transfer',
                operation: 'Transfert',
                source: 'savings',
                destination: 'cash',
                amount: numAmount,
                description: description.trim() || t('accounts.withdrawal_savings_to_cash'),
                date: new Date(),
            });
            await refreshData();
            resetModal();
            Alert.alert(t('common.success'), t('alerts.transferred_from_savings', {amount: formatAmount(numAmount)}));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setLoading(false);
        }
    }, [amount, description, savingsAccount, cashAccount, formatAmount, refreshData, resetModal, t]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{backgroundColor: colors.background}}>
                <ActivityIndicator size="large" color={colors.primary}/>
            </SafeAreaView>
        );
    }

    // Composant pour afficher une carte de compte
    const AccountCard = ({
                             account,
                             title,
                             subtitle,
                             icon,
                             iconBgColor,
                             iconColor,
                             amountColor,
                             buttons
                         }: any) => (
        <View className="mx-4 mt-4 p-5 rounded-2xl"
              style={{backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border}}>
            {/* En-tête avec titre et bouton historique */}
            <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-full items-center justify-center mr-3"
                          style={{backgroundColor: iconBgColor}}>
                        <MaterialIcons name={icon} size={24} color={iconColor}/>
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-semibold" style={{color: colors.text}}>{title}</Text>
                        {subtitle && (
                            <Text className="text-sm" style={{color: colors.textSecondary}}>{subtitle}</Text>
                        )}
                    </View>
                </View>

                {/* Bouton historique */}
                <TouchableOpacity
                    onPress={() => {
                        setSelectedAccount(account);
                        setModalType('HISTORY');
                        setModalVisible(true);
                    }}
                    className="p-2 rounded-full"
                    style={{backgroundColor: `${iconColor}15`}}
                >
                    <MaterialIcons name="history" size={22} color={iconColor}/>
                </TouchableOpacity>
            </View>

            {/* Montant */}
            <View className="mb-4 pt-2 pb-2">
                <Text className="text-sm mb-1"
                      style={{color: colors.textSecondary}}>{t('accounts.current_balance')}</Text>
                <Text className="text-3xl font-bold" style={{color: amountColor}}>
                    {formatAmount(account?.balance || 0)}
                </Text>
            </View>

            {/* Boutons d'action */}
            <View className="flex-row flex-wrap gap-2 mt-2">
                {buttons.map((btn: any, idx: number) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={btn.onPress}
                        disabled={btn.disabled}
                        className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                        style={{backgroundColor: btn.color, opacity: btn.disabled ? 0.5 : 1}}
                    >
                        <MaterialIcons name={btn.icon} size={18} color="white"/>
                        <Text className="text-white font-semibold ml-1 text-sm">{btn.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Message informatif pour le compte espèces */}
            {account?.type === 'cash' && (
                <View className="mt-3 p-3 rounded-xl" style={{backgroundColor: `${colors.primary}10`}}>
                    <Text className="text-xs text-center" style={{color: colors.textSecondary}}>
                        💡 {t('accounts.cash_info')}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView className="flex-1" style={{backgroundColor: colors.background}}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Compte Bancaire */}
                <AccountCard
                    account={bankAccount}
                    title={t('accounts.bank_account')}
                    subtitle={bankAccount?.bankName || 'Banque'}
                    icon="account-balance"
                    iconBgColor={`${colors.primary}15`}
                    iconColor={colors.primary}
                    amountColor={colors.text}
                    buttons={[
                        {
                            label: t('accounts.top_up'),
                            icon: "add",
                            color: colors.primary,
                            onPress: () => {
                                setModalType('ALIMENT-BANK');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        },
                        {
                            label: t('accounts.to_cash'),
                            icon: "swap-horiz",
                            color: colors.secondary || '#3B82F6',
                            onPress: () => {
                                setModalType('BANK-TO-ESPECE');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        },
                        {
                            label: t('accounts.expense'),
                            icon: "shopping-cart",
                            color: colors.error || '#EF4444',
                            onPress: () => {
                                setModalType('BANK-EXPENSE');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        }
                    ]}
                />

                {/* Espèces */}
                <AccountCard
                    account={cashAccount}
                    title={t('accounts.cash')}
                    subtitle={t('accounts.available_cash')}
                    icon="attach-money"
                    iconBgColor={`${colors.success}15`}
                    iconColor={colors.success}
                    amountColor={colors.text}
                    buttons={[
                        {
                            label: t('accounts.top_up'),
                            icon: "add",
                            color: colors.primary,
                            onPress: () => {
                                setModalType('CASH-ALIMENT');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        },
                        {
                            label: t('accounts.cash_to_savings'),
                            icon: "savings",
                            color: colors.warning || '#F59E0B',
                            onPress: () => {
                                setModalType('ESPECE-TO-EPARGNE');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        }
                    ]}
                />

                {/* Épargne */}
                <AccountCard
                    account={savingsAccount}
                    title={t('accounts.savings')}
                    subtitle={t('accounts.savings_info')}
                    icon="savings"
                    iconBgColor={`${colors.success}15`}
                    iconColor={colors.success}
                    amountColor={colors.text}
                    buttons={[
                        {
                            label: t('accounts.savings_to_cash'),
                            icon: "arrow-upward",
                            color: colors.success,
                            onPress: () => {
                                setModalType('EPARGNE-TO-ESPECE');
                                setAmount('');
                                setDescription('');
                                setModalVisible(true);
                            }
                        }
                    ]}
                />
            </ScrollView>

            {/* Modal de transfert/dépense */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible && modalType !== 'HISTORY'}
                onRequestClose={resetModal}
            >
                <View className="flex-1 justify-end" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <View className="rounded-t-3xl p-6" style={{backgroundColor: colors.background}}>
                        <Text className="text-xl font-bold mb-4" style={{color: colors.text}}>
                            {modalType === 'ALIMENT-BANK' && t('accounts.top_up_bank')}
                            {modalType === 'BANK-TO-ESPECE' && t('accounts.transfer_bank_to_cash')}
                            {modalType === 'BANK-EXPENSE' && t('accounts.bank_expense')}
                            {modalType === 'CASH-ALIMENT' && t('accounts.top_up_cash')}
                            {modalType === 'ESPECE-TO-EPARGNE' && t('accounts.transfer_cash_to_savings')}
                            {modalType === 'EPARGNE-TO-ESPECE' && t('accounts.transfer_savings_to_cash')}
                        </Text>

                        <TextInput
                            placeholder={t('accounts.amount')}
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            className="p-3 rounded-xl mb-3"
                            style={{
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderWidth: 1,
                                borderColor: colors.border,
                                fontSize: 24,
                                textAlign: 'center'
                            }}
                        />

                        <TextInput
                            placeholder={t('accounts.description_optional')}
                            placeholderTextColor={colors.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                            className="p-3 rounded-xl mb-4"
                            style={{
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}
                        />

                        {modalType === 'ALIMENT-BANK' && (
                            <TouchableOpacity
                                onPress={handleAlimenterBanque}
                                disabled={loading}
                                className="p-3 rounded-xl mb-2"
                                style={{backgroundColor: colors.primary, opacity: loading ? 0.7 : 1}}
                            >
                                <Text className="text-white text-center font-semibold">
                                    {loading ? t('common.loading') : t('accounts.top_up_bank')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {modalType === 'BANK-TO-ESPECE' && (
                            <TouchableOpacity
                                onPress={handleBankToCash}
                                disabled={loading}
                                className="p-3 rounded-xl mb-2"
                                style={{backgroundColor: colors.secondary, opacity: loading ? 0.7 : 1}}
                            >
                                <Text className="text-white text-center font-semibold">
                                    {loading ? t('common.loading') : t('accounts.transfer_bank_to_cash')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {modalType === 'BANK-EXPENSE' && (
                            <TouchableOpacity
                                onPress={handleBankExpense}
                                disabled={loading}
                                className="p-3 rounded-xl mb-2"
                                style={{backgroundColor: colors.error, opacity: loading ? 0.7 : 1}}
                            >
                                <Text className="text-white text-center font-semibold">
                                    {loading ? t('common.loading') : t('accounts.confirm_expense')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {modalType === 'CASH-ALIMENT' && (
                            <TouchableOpacity
                                onPress={handleCashAliment}
                                disabled={loading}
                                className="p-3 rounded-xl mb-2"
                                style={{ backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }}
                            >
                                <Text className="text-white text-center font-semibold">
                                    {loading ? t('common.loading') : t('accounts.top_up_cash')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {modalType === 'ESPECE-TO-EPARGNE' && (
                            <TouchableOpacity
                                onPress={handleCashToEpargne}
                                disabled={loading}
                                className="p-3 rounded-xl mb-2"
                                style={{backgroundColor: colors.warning, opacity: loading ? 0.7 : 1}}
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
                                style={{backgroundColor: colors.success, opacity: loading ? 0.7 : 1}}
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
                            <Text className="text-center"
                                  style={{color: colors.textSecondary}}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <HistoryModal/>
        </SafeAreaView>
    );
};

export default Accounts;