import { storageService } from '@/hooks/use-storage';
import { Account, Budget, Transaction } from '@/types';

class BudgetStorageService {
    private readonly KEYS = {
        ACCOUNTS: 'accounts' as const,
        BUDGETS: 'budgets' as const,
        TRANSACTIONS: 'transactions' as const,
    };

    // ============ ACCOUNTS ============
    async getAccounts(): Promise<Account[]> {
        const accounts = await storageService.getItem<Account[]>(this.KEYS.ACCOUNTS);
        return accounts || [];
    }

    async addAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
        console.log('📝 addAccount appelé:', account);
        const accounts = await this.getAccounts();
        console.log('📊 Comptes avant ajout:', accounts.length);

        const bankAccounts = accounts.filter(a => a.type === 'bank');
        if (account.type === 'bank' && bankAccounts.length >= 4) {
            throw new Error('Maximum 4 comptes bancaires autorisés');
        }

        const newAccount: Account = {
            ...account,
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        accounts.push(newAccount);
        await storageService.setItem(this.KEYS.ACCOUNTS, accounts);
        console.log('✅ Compte ajouté:', newAccount);
        return newAccount;
    }

    async updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
        console.log('🔄 updateAccountBalance appelé:', { accountId, newBalance });
        const accounts = await this.getAccounts();
        console.log('📊 Comptes avant mise à jour:', accounts);
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].balance = newBalance;
            accounts[accountIndex].updatedAt = new Date();
            await storageService.setItem(this.KEYS.ACCOUNTS, accounts);
            console.log('✅ Compte mis à jour:', accounts[accountIndex]);
        } else {
            console.log('❌ Compte non trouvé:', accountId);
        }
    }

    // ============ BUDGETS ============
    async getBudgets(): Promise<Budget[]> {
        const budgets = await storageService.getItem<Budget[]>(this.KEYS.BUDGETS);
        return budgets || [];
    }

    async addBudget(budget: Omit<Budget, 'id' | 'spent' | 'remaining' | 'isClosed' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
        const budgets = await this.getBudgets();
        const newBudget: Budget = {
            ...budget,
            id: Date.now().toString(),
            spent: 0,
            remaining: budget.amount,
            isClosed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        budgets.push(newBudget);
        await storageService.setItem(this.KEYS.BUDGETS, budgets);
        return newBudget;
    }

    async updateBudgetSpent(budgetId: string, amount: number): Promise<void> {
        const budgets = await this.getBudgets();
        const budgetIndex = budgets.findIndex(b => b.id === budgetId);
        if (budgetIndex !== -1) {
            budgets[budgetIndex].spent += amount;
            budgets[budgetIndex].remaining = budgets[budgetIndex].amount - budgets[budgetIndex].spent;
            budgets[budgetIndex].updatedAt = new Date();
            await storageService.setItem(this.KEYS.BUDGETS, budgets);
        }
    }

    async deleteBudget(budgetId: string): Promise<void> {
        const budgets = await this.getBudgets();
        const filtered = budgets.filter(b => b.id !== budgetId);
        await storageService.setItem(this.KEYS.BUDGETS, filtered);
    }

    // ============ TRANSACTIONS ============
    async getTransactions(): Promise<Transaction[]> {
        const transactions = await storageService.getItem<Transaction[]>(this.KEYS.TRANSACTIONS);
        return transactions || [];
    }

    async addTransaction(transaction: Omit<Transaction, 'id' | 'status' | 'createdAt'>): Promise<Transaction> {
        console.log('🔄 addTransaction appelé:', transaction);
        const transactions = await this.getTransactions();
        const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
            status: 'completed',
            createdAt: new Date(),
        };

        transactions.push(newTransaction);
        await storageService.setItem(this.KEYS.TRANSACTIONS, transactions);
        console.log('✅ Transaction ajoutée:', newTransaction);
        return newTransaction;
    }

    async deleteTransaction(transactionId: string): Promise<void> {
        const transactions = await this.getTransactions();
        const filtered = transactions.filter(t => t.id !== transactionId);
        await storageService.setItem(this.KEYS.TRANSACTIONS, filtered);
    }

    // ============ RESET ============
    async resetAllData(): Promise<void> {
        await storageService.clearAll();
    }
}

export const budgetStorageService = new BudgetStorageService();