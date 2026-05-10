// store/slices/data.slice.ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { budgetStorageService } from '@/services/storage.service';
import { Account, Budget, Transaction } from '@/types';
import { storageService } from "@/hooks/use-storage";

interface DataState {
    accounts: Account[];
    budgets: Budget[];
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
}

const initialState: DataState = {
    accounts: [],
    budgets: [],
    transactions: [],
    isLoading: false,
    error: null,
};

// Thunk pour initialiser les données par défaut
export const initializeDefaultData = createAsyncThunk('data/initializeDefaultData', async () => {
    const existingAccounts = await budgetStorageService.getAccounts();

    if (existingAccounts.length === 0) {
        // Créer compte bancaire
        await budgetStorageService.addAccount({
            name: 'Compte Bancaire',
            bankName: 'Banque',
            type: 'bank',
            balance: 0,
        });
        // Créer compte espèces
        await budgetStorageService.addAccount({
            name: 'Espèces',
            type: 'cash',
            balance: 0,
        });
        // Créer compte épargne
        await budgetStorageService.addAccount({
            name: 'Épargne',
            type: 'savings',
            balance: 0,
        });
    }

    const [accounts, budgets, transactions] = await Promise.all([
        budgetStorageService.getAccounts(),
        budgetStorageService.getBudgets(),
        budgetStorageService.getTransactions(),
    ]);

    return { accounts, budgets, transactions };
});

// Thunk pour charger toutes les données
export const loadAllData = createAsyncThunk('data/loadAllData', async () => {
    const [accounts, budgets, transactions] = await Promise.all([
        budgetStorageService.getAccounts(),
        budgetStorageService.getBudgets(),
        budgetStorageService.getTransactions(),
    ]);
    return { accounts, budgets, transactions };
});

// Thunk pour mettre à jour un compte
export const updateAccountBalance = createAsyncThunk(
    'data/updateAccountBalance',
    async ({ accountId, newBalance }: { accountId: string; newBalance: number }) => {
        console.log('🔄 updateAccountBalance appelé:', { accountId, newBalance });

        // Récupérer les comptes actuels
        let accounts = await budgetStorageService.getAccounts();
        console.log('📊 Comptes avant mise à jour:', accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance })));

        // Mettre à jour le compte
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].balance = newBalance;
            accounts[accountIndex].updatedAt = new Date();

            // Sauvegarder
            await storageService.setItem('accounts', accounts);
            console.log('✅ Compte mis à jour:', accounts[accountIndex]);
        } else {
            console.error('❌ Compte non trouvé:', accountId);
            throw new Error('Compte non trouvé');
        }

        // Recharger toutes les données pour s'assurer d'avoir les dernières valeurs
        const [newAccounts, budgets, transactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);

        console.log('📊 Comptes après mise à jour:', newAccounts.map(a => ({ id: a.id, name: a.name, balance: a.balance })));

        return { accounts: newAccounts, budgets, transactions };
    }
);

// Thunk pour ajouter une transaction
export const addTransaction = createAsyncThunk(
    'data/addTransaction',
    async (transaction: Omit<Transaction, 'id' | 'status' | 'createdAt'>) => {
        await budgetStorageService.addTransaction(transaction);
        const [accounts, budgets, transactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);
        return { accounts, budgets, transactions };
    }
);

// Thunk pour ajouter un budget
export const addBudget = createAsyncThunk(
    'data/addBudget',
    async (budget: Omit<Budget, 'id' | 'totalDepense' | 'isClosed' | 'createdAt' | 'updatedAt'>) => {
        // 1. Trouver le compte espèces
        const accounts = await budgetStorageService.getAccounts();
        const cashAccount = accounts.find(a => a.type === 'cash');

        if (!cashAccount) {
            throw new Error('Compte espèces non trouvé');
        }

        if (cashAccount.balance < budget.totalAlimente) {
            throw new Error(`Solde espèces insuffisant. Disponible: ${cashAccount.balance}`);
        }

        // 2. Diminuer les espèces
        await budgetStorageService.updateAccountBalance(cashAccount.id, cashAccount.balance - budget.totalAlimente);

        // 3. Ajouter le budget
        const newBudget = await budgetStorageService.addBudget(budget);

        // 4. Ajouter une transaction d'alimentation
        await budgetStorageService.addTransaction({
            type: 'income',
            operation: 'Alimentation',
            source: 'cash',
            destination: 'budget',
            budgetId: newBudget.id,
            amount: budget.totalAlimente,
            description: `Création du budget ${budget.name}`,
            date: new Date(),
        } as any);

        const [newAccounts, newBudgets, newTransactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);

        return { accounts: newAccounts, budgets: newBudgets, transactions: newTransactions };
    }
);

// Thunk pour supprimer un budget
export const deleteBudget = createAsyncThunk('data/deleteBudget', async (budgetId: string) => {
    // 1. Récupérer le budget à supprimer
    const budgets = await budgetStorageService.getBudgets();
    const budgetToDelete = budgets.find(b => b.id === budgetId);
    const transactions = await budgetStorageService.getTransactions();

    // 2. Calculer le solde restant à partir des transactions
    const budgetTransactions = transactions.filter(t => t.budgetId === budgetId);
    const totalAlimente = budgetTransactions
        .filter(t => t.operation === 'Alimentation')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalDepense = budgetTransactions
        .filter(t => t.operation === 'Dépense')
        .reduce((sum, t) => sum + t.amount, 0);
    const soldeRestant = totalAlimente - totalDepense;

    // 3. Remettre le solde dans les espèces (si > 0)
    if (soldeRestant > 0) {
        const accounts = await budgetStorageService.getAccounts();
        const cashAccount = accounts.find(a => a.type === 'cash');
        if (cashAccount) {
            await budgetStorageService.updateAccountBalance(cashAccount.id, cashAccount.balance + soldeRestant);
            await budgetStorageService.addTransaction({
                type: 'income',
                operation: 'Remboursement',
                source: 'budget',
                destination: 'cash',
                amount: soldeRestant,
                description: `Remboursement du budget supprimé "${budgetToDelete?.name}"`,
                date: new Date(),
            } as any);
        }
    }

    // 4. Supprimer le budget
    await budgetStorageService.deleteBudget(budgetId);

    const [newAccounts, newBudgets, newTransactions] = await Promise.all([
        budgetStorageService.getAccounts(),
        budgetStorageService.getBudgets(),
        budgetStorageService.getTransactions(),
    ]);

    return { accounts: newAccounts, budgets: newBudgets, transactions: newTransactions };
});

// Thunk pour mettre à jour un budget (nom et couleur)
export const updateBudget = createAsyncThunk(
    'data/updateBudget',
    async ({ budgetId, name, color }: { budgetId: string; name: string; color: string }) => {
        const budgets = await budgetStorageService.getBudgets();
        const budgetIndex = budgets.findIndex(b => b.id === budgetId);

        if (budgetIndex === -1) {
            throw new Error('Budget non trouvé');
        }

        const oldName = budgets[budgetIndex].name;

        budgets[budgetIndex] = {
            ...budgets[budgetIndex],
            name: name,
            color: color,
            updatedAt: new Date(),
        };

        await storageService.setItem('budgets', budgets);

        const [newAccounts, newBudgets, newTransactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);

        return { accounts: newAccounts, budgets: newBudgets, transactions: newTransactions };
    }
);

// Thunk pour ajouter un compte
export const addAccount = createAsyncThunk(
    'data/addAccount',
    async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
        await budgetStorageService.addAccount(account);
        const [accounts, budgets, transactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);
        return { accounts, budgets, transactions };
    }
);

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeDefaultData.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(initializeDefaultData.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(initializeDefaultData.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur d\'initialisation';
            })
            .addCase(loadAllData.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadAllData.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(loadAllData.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur de chargement';
            })
            .addCase(updateAccountBalance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateAccountBalance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(updateAccountBalance.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur de mise à jour';
            })
            .addCase(addTransaction.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addTransaction.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(addTransaction.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur lors de la transaction';
            })
            .addCase(addBudget.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addBudget.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(addBudget.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur lors de la création du budget';
            })
            .addCase(deleteBudget.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteBudget.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(deleteBudget.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur lors de la suppression';
            })
            .addCase(updateBudget.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateBudget.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(updateBudget.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur lors de la modification';
            })
            .addCase(addAccount.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addAccount.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(addAccount.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur lors de la création du compte';
            });
    },
});

export const { clearError } = dataSlice.actions;
export default dataSlice.reducer;