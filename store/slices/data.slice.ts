// store/slices/data.slice.ts
import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {budgetStorageService} from '@/services/storage.service';
import {Account, Budget, Transaction} from '@/types';
import {storageService} from "@/hooks/use-storage";
import i18n from "i18next";

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

// Helper function to get translation
const t = (key: string, options?: any) => {
    // eslint-disable-next-line import/no-named-as-default-member
    return i18n.t(key, options);
};

// Thunk pour initialiser les données par défaut
export const initializeDefaultData = createAsyncThunk('data/initializeDefaultData', async () => {
    const existingAccounts = await budgetStorageService.getAccounts();

    // Si aucun compte n'existe, créer les comptes par défaut
    if (existingAccounts.length === 0) {
        console.log('📝 Création des comptes par défaut...');

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

        console.log('Comptes par défaut créés');
    }

    // Charger toutes les données après initialisation
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
        console.log('🔄 updateAccountBalance:', { accountId, newBalance });
        await budgetStorageService.updateAccountBalance(accountId, newBalance);
        const [accounts, budgets, transactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);
        return { accounts, budgets, transactions };
    }
);

// Thunk pour mettre à jour un budget
export const updateBudgetSpent = createAsyncThunk(
    'data/updateBudgetSpent',
    async ({ budgetId, amount }: { budgetId: string; amount: number }) => {
        await budgetStorageService.updateBudgetSpent(budgetId, amount);
        const [accounts, budgets, transactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);
        return { accounts, budgets, transactions };
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
    async (budget: Omit<Budget, 'id' | 'spent' | 'remaining' | 'isClosed' | 'createdAt' | 'updatedAt'>) => {
        // 1. Trouver le compte espèces
        const accounts = await budgetStorageService.getAccounts();
        const cashAccount = accounts.find(a => a.type === 'cash');

        if (!cashAccount) {
            throw new Error('Compte espèces non trouvé');
        }

        if (cashAccount.balance < budget.amount) {
            throw new Error(`Solde espèces insuffisant. Disponible: ${cashAccount.balance}`);
        }

        // 2. Diminuer les espèces
        await budgetStorageService.updateAccountBalance(cashAccount.id, cashAccount.balance - budget.amount);

        // 3. Ajouter le budget
        await budgetStorageService.addBudget(budget);

        // 4. Ajouter une transaction d'alimentation
        await budgetStorageService.addTransaction({
            type: 'income',
            operation: 'Alimentation',
            source: 'cash',
            destination: 'budget',
            amount: budget.amount,
            description: t('budgets.creation_of_budget', {name: budget.name}),
            date: new Date(),
        } as any);

        // 5. Recharger toutes les données
        const [newAccounts, newBudgets, newTransactions] = await Promise.all([
            budgetStorageService.getAccounts(),
            budgetStorageService.getBudgets(),
            budgetStorageService.getTransactions(),
        ]);

        return { accounts: newAccounts, budgets: newBudgets, transactions: newTransactions };
    }
);

// Thunk pour supprimer un budget (remet le solde restant dans les espèces)
export const deleteBudget = createAsyncThunk('data/deleteBudget', async (budgetId: string) => {
    // 1. Récupérer le budget à supprimer
    const budgets = await budgetStorageService.getBudgets();
    const budgetToDelete = budgets.find(b => b.id === budgetId);

    if (!budgetToDelete) {
        throw new Error('Budget non trouvé');
    }

    // 2. Calculer le solde restant du budget
    // Solde = amount — spent (mais spent peut être négatif si alimentations)
    let soldeRestant = budgetToDelete.amount - budgetToDelete.spent;
    if (budgetToDelete.spent < 0) {
        // Si spent négatif, on a alimenté plus que dépensé
        soldeRestant = budgetToDelete.amount + Math.abs(budgetToDelete.spent);
    }

    // 3. Remettre le solde dans les espèces (si > 0)
    if (soldeRestant > 0) {
        const accounts = await budgetStorageService.getAccounts();
        const cashAccount = accounts.find(a => a.type === 'cash');

        if (cashAccount) {
            const newCashBalance = cashAccount.balance + soldeRestant;
            await budgetStorageService.updateAccountBalance(cashAccount.id, newCashBalance);

            // 4. Ajouter une transaction pour tracer le remboursement
            await budgetStorageService.addTransaction({
                type: 'income',
                operation: 'Remboursement',
                source: 'budget',
                destination: 'cash',
                amount: soldeRestant,
                description: t('budgets.reimbursement_of_budget_deleted', {name: budgetToDelete.name}),
                date: new Date(),
            } as any);
        }
    }

    // 5. Supprimer le budget
    await budgetStorageService.deleteBudget(budgetId);

    // 6. Recharger toutes les données
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
        // 1. Récupérer tous les budgets
        const budgets = await budgetStorageService.getBudgets();
        const budgetIndex = budgets.findIndex(b => b.id === budgetId);

        if (budgetIndex === -1) {
            console.log('budget non trouvé');
            throw new Error('Budget non trouvé');
        }

        // 2. Mettre à jour le budget
        budgets[budgetIndex] = {
            ...budgets[budgetIndex],
            name: name,
            color: color,
            updatedAt: new Date(),
        };

        // 3. Sauvegarder dans le storage
        await storageService.setItem('budgets', budgets);

        // 4. Ajouter une transaction pour tracer la modification (optionnel)
        await budgetStorageService.addTransaction({
            type: 'edit',
            operation: 'Modification',
            source: 'budget',
            destination: 'budget',
            amount: 0,
            description: t('budgets.budget_modification', {oldName: budgets[budgetIndex].name, newName: name}),
            date: new Date(),
        } as any);

        // 5. Recharger toutes les données
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
            // initializeDefaultData
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
            // loadAllData
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
            // updateAccountBalance
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
            // updateBudgetSpent
            .addCase(updateBudgetSpent.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateBudgetSpent.fulfilled, (state, action) => {
                state.isLoading = false;
                state.accounts = action.payload.accounts;
                state.budgets = action.payload.budgets;
                state.transactions = action.payload.transactions;
            })
            .addCase(updateBudgetSpent.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Erreur de mise à jour';
            })
            // addTransaction
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
            // addBudget
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
            // deleteBudget
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
                state.error = action.error.message || 'Erreur lors de la modification du budget';
            })
            // addAccount
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