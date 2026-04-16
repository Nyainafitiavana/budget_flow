// app/(tabs)/dashboard.tsx
import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetData } from '@/hooks/use-budget-data';
import { useCurrency } from '@/hooks/use-currency';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const Dashboard = () => {
    const { colors, isDark } = useTheme();
    const { accounts, budgets, transactions, isLoading } = useBudgetData();
    const { formatAmount } = useCurrency();

    const bankAccount = accounts.find(a => a.type === 'bank');
    const cashAccount = accounts.find(a => a.type === 'cash');
    const savingsAccount = accounts.find(a => a.type === 'savings');

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => {
        if (b.spent < 0) return sum;
        return sum + b.spent;
    }, 0);

    const getBudgetRemaining = (budget: any) => {
        if (budget.spent < 0) {
            return budget.amount + Math.abs(budget.spent);
        }
        return budget.amount - budget.spent;
    };

    const getBudgetPercentage = (budget: any) => {
        let total = budget.amount;
        let depense = budget.spent;
        if (budget.spent < 0) {
            total = budget.amount + Math.abs(budget.spent);
            depense = 0;
        }
        return total > 0 ? (depense / total) * 100 : 0;
    };

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
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#0F172A'] : ['#2563EB', '#3B82F6']}
                    className="px-6 pt-8 pb-12"
                    style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
                >
                    <Text className="text-white/80 text-sm mb-2">Solde total</Text>
                    <Text className="text-white text-4xl font-bold mb-6">{formatAmount(totalBalance)}</Text>
                    <View className="flex-row justify-between">
                        <View>
                            <Text className="text-white/80 text-xs mb-1">Banque</Text>
                            <Text className="text-white text-lg font-semibold">{formatAmount(bankAccount?.balance || 0)}</Text>
                        </View>
                        <View>
                            <Text className="text-white/80 text-xs mb-1">Espèces</Text>
                            <Text className="text-white text-lg font-semibold">{formatAmount(cashAccount?.balance || 0)}</Text>
                        </View>
                        <View>
                            <Text className="text-white/80 text-xs mb-1">Épargne</Text>
                            <Text className="text-white text-lg font-semibold">{formatAmount(savingsAccount?.balance || 0)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View className="px-6 pt-6">
                    <View className="flex-row justify-between mb-6">
                        <View className="flex-1 mr-2 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Budget total</Text>
                            <Text className="text-xl font-bold" style={{ color: colors.primary }}>{formatAmount(totalBudget)}</Text>
                        </View>
                        <View className="flex-1 ml-2 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>Dépensé total</Text>
                            <Text className="text-xl font-bold" style={{ color: colors.error }}>{formatAmount(totalSpent)}</Text>
                        </View>
                    </View>

                    <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Budgets</Text>

                    {budgets.filter(b => !b.isClosed).length === 0 ? (
                        <View className="p-4 rounded-xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Aucun budget pour le moment</Text>
                            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Ajoutez un budget dans l&#39;onglet Budgets</Text>
                        </View>
                    ) : (
                        budgets.filter(b => !b.isClosed).slice(0, 3).map((budget) => {
                            const remaining = getBudgetRemaining(budget);
                            const percentage = getBudgetPercentage(budget);
                            const spent = budget.spent > 0 ? budget.spent : 0;
                            const total = budget.spent < 0 ? budget.amount + Math.abs(budget.spent) : budget.amount;
                            return (
                                <View key={budget.id} className="mb-4">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-sm font-medium" style={{ color: colors.text }}>{budget.name}</Text>
                                        <Text className="text-sm" style={{ color: colors.textSecondary }}>{formatAmount(spent)} / {formatAmount(total)}</Text>
                                    </View>
                                    <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                                        <View className="h-full rounded-full" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: budget.color }} />
                                    </View>
                                    <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Restant: {formatAmount(remaining)}</Text>
                                </View>
                            );
                        })
                    )}

                    {budgets.filter(b => !b.isClosed).length > 3 && (
                        <Text className="text-xs text-center mt-2" style={{ color: colors.textSecondary }}>+{budgets.filter(b => !b.isClosed).length - 3} autres budgets</Text>
                    )}

                    <Text className="text-lg font-semibold mt-6 mb-4" style={{ color: colors.text }}>Dernières transactions</Text>

                    {transactions.length === 0 ? (
                        <View className="p-4 rounded-xl items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>Aucune transaction pour le moment</Text>
                            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Les transactions apparaîtront ici</Text>
                        </View>
                    ) : (
                        transactions.slice(0, 5).map((transaction) => {
                            const isEntree = transaction.operation === 'Alimentation';
                            const isSortie = transaction.operation === 'Dépense' || transaction.operation === 'Transfert';
                            return (
                                <View key={transaction.id} className="flex-row items-center justify-between p-3 mb-2 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                                    <View className="flex-row items-center flex-1">
                                        <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${colors.primary}15` }}>
                                            <MaterialIcons name={isEntree ? "arrow-downward" : isSortie ? "arrow-upward" : "swap-horiz"} size={20} color={isEntree ? colors.success : isSortie ? colors.error : colors.warning} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium" style={{ color: colors.text }}>{transaction.operation}</Text>
                                            <Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>{transaction.description || `${transaction.source} → ${transaction.destination || 'dépense'}`}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-semibold" style={{ color: isEntree ? colors.success : colors.error }}>{isEntree ? '+' : '-'} {formatAmount(transaction.amount)}</Text>
                                </View>
                            );
                        })
                    )}
                </View>
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default Dashboard;