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

const Budgets = () => {
    const { colors } = useTheme();
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
            Alert.alert('Erreur', 'Nom du budget requis');
            return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }

        // Vérifier le solde espèces avant
        if (!cashAccount || cashAccount.balance < numAmount) {
            Alert.alert('Erreur', `Solde espèces insuffisant. Disponible: ${formatAmount(cashAccount?.balance || 0)}`);
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
            Alert.alert('Succès', `Budget "${budgetName}" créé avec ${formatAmount(numAmount)}`);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    };

    // CORRECTION PRINCIPALE ICI
    const handleAlimenterBudget = async () => {
        if (!selectedBudget) {
            Alert.alert('Erreur', 'Budget non sélectionné');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }

        if (!cashAccount || cashAccount.balance < numAmount) {
            Alert.alert('Erreur', `Solde espèces insuffisant. Disponible: ${formatAmount(cashAccount?.balance || 0)}`);
            return;
        }

        setLoading(true);
        try {
            console.log(' Début alimentation budget');
            console.log(' Espèces avant:', cashAccount.balance);
            console.log(' Budget avant spent:', selectedBudget.spent);

            // 1. Diminuer les espèces
            const newCashBalance = cashAccount.balance - numAmount;
            await dispatch(updateAccountBalance({
                accountId: cashAccount.id,
                newBalance: newCashBalance
            })).unwrap();
            console.log(' Espèces après mise à jour:', newCashBalance);

            // 2. Modifier le budget (spent devient plus négatif pour augmenter le budget)
            const currentSpent = selectedBudget.spent;
            const newSpent = currentSpent - numAmount;
            await dispatch(updateBudgetSpent({
                budgetId: selectedBudget.id,
                amount: newSpent - currentSpent
            })).unwrap();
            console.log(' Budget spent après:', newSpent);

            // 3. Ajouter la transaction
            await dispatch(addTransaction({
                type: 'income',
                operation: 'Alimentation',
                source: 'cash',
                destination: 'budget',
                budgetId: selectedBudget.id,
                amount: numAmount,
                description: description || `Alimentation du budget ${selectedBudget.name}`,
                date: new Date(),
            })).unwrap();
            console.log(' Transaction ajoutée');

            // 4. Recharger les données
            await refreshData();
            console.log(' Données rechargées');

            resetModal();
            Alert.alert('Succès', `${formatAmount(numAmount)} ajouté au budget "${selectedBudget.name}"`);
        } catch (error: any) {
            console.error(' Erreur:', error);
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDepense = async () => {
        if (!selectedBudget) {
            Alert.alert('Erreur', 'Budget non sélectionné');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }
        const { solde } = getBudgetTotals(selectedBudget);
        if (solde < numAmount) {
            Alert.alert('Erreur', `Solde budget insuffisant. Restant: ${formatAmount(solde)}`);
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
                description: description.trim() || `Dépense depuis ${selectedBudget.name}`,
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert('Succès', `${formatAmount(numAmount)} dépensé depuis "${selectedBudget.name}"`);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransferToSavings = async () => {
        if (!selectedBudget) {
            Alert.alert('Erreur', 'Budget non sélectionné');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }
        const { solde } = getBudgetTotals(selectedBudget);
        if (solde < numAmount) {
            Alert.alert('Erreur', `Solde budget insuffisant. Restant: ${formatAmount(solde)}`);
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
                description: description || `Transfert vers épargne depuis ${selectedBudget.name}`,
                date: new Date(),
            })).unwrap();

            await refreshData();
            resetModal();
            Alert.alert('Succès', `${formatAmount(numAmount)} transféré vers l'épargne`);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
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
            ? `Voulez-vous vraiment supprimer le budget "${budget.name}" ?\n\nLe solde restant de ${formatAmount(soldeRestant)} sera remboursé dans vos espèces.`
            : `Voulez-vous vraiment supprimer le budget "${budget.name}" ?\n\nCe budget n'a pas de solde restant.`;

        Alert.alert(
            'Supprimer le budget',
            message,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            // Appeler deleteBudget avec remboursement automatique
                            await dispatch(deleteBudget(budget.id)).unwrap();
                            await refreshData();
                            Alert.alert('Succès', `Budget "${budget.name}" supprimé${soldeRestant > 0 ? `, ${formatAmount(soldeRestant)} a été remboursé dans vos espèces` : ''}`);
                        } catch (error: any) {
                            Alert.alert('Erreur', error.message);
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
                            <Text className="text-xl font-bold" style={{ color: colors.text }}>Historique - {selectedBudget.name}</Text>
                            <TouchableOpacity onPress={resetModal}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between mb-4 p-3 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>Total</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.primary }}>{formatAmount(totalReel)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>Dépensé</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.error }}>{formatAmount(depenses)}</Text>
                            </View>
                            <View>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>Solde</Text>
                                <Text className="text-lg font-bold" style={{ color: colors.success }}>{formatAmount(solde)}</Text>
                            </View>
                        </View>

                        {budgetTransactions.length === 0 ? (
                            <View className="items-center py-8">
                                <MaterialIcons name="history" size={50} color={colors.textSecondary} />
                                <Text className="text-center mt-3" style={{ color: colors.textSecondary }}>Aucune transaction pour ce budget</Text>
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
                            <Text className="text-white text-center font-semibold">Fermer</Text>
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
                    <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>Nouveau budget</Text>
                    <TextInput placeholder="Nom du budget" placeholderTextColor={colors.textSecondary} value={budgetName} onChangeText={setBudgetName} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TextInput placeholder="Montant initial" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={budgetAmount} onChangeText={setBudgetAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <Text className="text-sm mb-2" style={{ color: colors.text }}>Couleur:</Text>
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
                        <Text className="text-white text-center font-semibold">{loading ? 'Création...' : 'Créer le budget'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderAlimenterModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'alimenter' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>Alimenter le budget</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.success }}>Espèces disponibles: {formatAmount(cashAccount?.balance || 0)}</Text>
                    <TextInput placeholder="Montant à ajouter" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder="Description (optionnelle)" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleAlimenterBudget} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? 'Traitement...' : 'Alimenter'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderDepenseModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'depense' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>Dépenser</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.warning }}>Solde actuel: {formatAmount(getBudgetTotals(selectedBudget).solde)}</Text>
                    <TextInput placeholder="Montant de la dépense" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder="Description (optionnelle)" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleDepense} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.error, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? 'Traitement...' : 'Dépenser'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderTransferModal = () => (
        <Modal animationType="slide" transparent={true} visible={modalVisible && modalType === 'transferToSavings' && selectedBudget !== null} onRequestClose={resetModal}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>Transférer vers l&#39;épargne</Text>
                    <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget: {selectedBudget?.name}</Text>
                    <Text className="text-sm mb-4" style={{ color: colors.success }}>Solde actuel: {formatAmount(getBudgetTotals(selectedBudget).solde)}</Text>
                    <TextInput placeholder="Montant à transférer" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} className="p-3 rounded-xl mb-3" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 24, textAlign: 'center' }} />
                    <TextInput placeholder="Description (optionnelle)" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} className="p-3 rounded-xl mb-4" style={{ backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={handleTransferToSavings} disabled={loading} className="p-3 rounded-xl mb-2" style={{ backgroundColor: colors.success, opacity: loading ? 0.7 : 1 }}>
                        <Text className="text-white text-center font-semibold">{loading ? 'Traitement...' : 'Transférer'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetModal} className="p-3 rounded-xl">
                        <Text className="text-center" style={{ color: colors.textSecondary }}>Annuler</Text>
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
                            <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Espèces disponibles</Text>
                            <Text className="text-2xl font-bold" style={{ color: colors.primary }}>{formatAmount(cashAccount?.balance || 0)}</Text>
                        </View>
                        <MaterialIcons name="attach-money" size={40} color={colors.primary} />
                    </View>
                </View>

                <View className="flex-row justify-between items-center px-4 pt-6 mb-4">
                    <Text className="text-xl font-semibold" style={{ color: colors.text }}>Mes budgets</Text>
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
                        <Text className="text-white font-semibold ml-1">Ajouter</Text>
                    </TouchableOpacity>
                </View>

                {!hasCash && (
                    <View className="mx-4 mb-4 p-3 rounded-xl" style={{ backgroundColor: `${colors.warning}15`, borderWidth: 1, borderColor: `${colors.warning}30` }}>
                        <View className="flex-row items-center">
                            <MaterialIcons name="info" size={20} color={colors.warning} />
                            <Text className="text-sm ml-2 flex-1" style={{ color: colors.textSecondary }}>
                                Ajoutez des espèces depuis l&#39;onglet Comptes pour pouvoir créer un budget
                            </Text>
                        </View>
                    </View>
                )}

                {budgets.filter(b => !b.isClosed).length === 0 ? (
                    <View className="mx-4 p-8 rounded-xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <MaterialIcons name="account-balance-wallet" size={50} color={colors.textSecondary} />
                        <Text className="text-center mt-3" style={{ color: colors.textSecondary }}>Aucun budget pour le moment</Text>
                        <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>Cliquez sur &#34Ajouter&#34; pour créer votre premier budget</Text>
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
                                    <Text className="text-sm" style={{ color: colors.textSecondary }}>Solde actuel</Text>
                                    <Text className="text-2xl font-bold" style={{ color: budget.color }}>{formatAmount(solde)}</Text>
                                </View>

                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-xs" style={{ color: colors.textSecondary }}>Total: {formatAmount(totalReel)}</Text>
                                    <Text className="text-xs" style={{ color: colors.error }}>Dépensé: {formatAmount(depenses)}</Text>
                                </View>

                                <View className="mt-1">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-xs" style={{ color: colors.textSecondary }}>Utilisation</Text>
                                        <Text className="text-xs font-medium" style={{ color: budget.color }}>{pourcentage.toFixed(0)}%</Text>
                                    </View>
                                    <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                                        <View className="h-full rounded-full" style={{ width: `${Math.min(pourcentage, 100)}%`, backgroundColor: budget.color }} />
                                    </View>
                                </View>

                                <View className="flex-row flex-wrap gap-2 mt-4">
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('alimenter'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                        <MaterialIcons name="add" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">Alimenter</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('depense'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.error }}>
                                        <MaterialIcons name="shopping-cart" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">Dépenser</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setSelectedBudget(budget); setModalType('transferToSavings'); setAmount(''); setDescription(''); setModalVisible(true); }} className="flex-1 py-2 rounded-xl flex-row items-center justify-center" style={{ backgroundColor: colors.success }}>
                                        <MaterialIcons name="savings" size={18} color="white" />
                                        <Text className="text-white font-semibold ml-1 text-sm">→ Épargne</Text>
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