// services/storage.service.ts
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
        const accounts = await this.getAccounts();
        const bankAccounts = accounts.filter(a => a.type === 'bank');
        if (account.type === 'bank' && bankAccounts.length >= 4) {
            throw new Error('Maximum 4 comptes bancaires autorisés');
        }

        const newAccount: Account = {
            ...account,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // ← ID unique garanti
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        accounts.push(newAccount);
        await storageService.setItem(this.KEYS.ACCOUNTS, accounts);
        return newAccount;
    }

    async updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
        const accounts = await this.getAccounts();
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].balance = newBalance;
            accounts[accountIndex].updatedAt = new Date();
            await storageService.setItem(this.KEYS.ACCOUNTS, accounts);
        }
    }

    // ============ BUDGETS ============
    async getBudgets(): Promise<Budget[]> {
        const budgets = await storageService.getItem<Budget[]>(this.KEYS.BUDGETS);
        return budgets || [];
    }

    async addBudget(budget: Omit<Budget, 'id' | 'totalDepense' | 'isClosed' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
        const budgets = await this.getBudgets();
        const newBudget: Budget = {
            ...budget,
            id: Date.now().toString(),
            totalDepense: 0,
            isClosed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        budgets.push(newBudget);
        await storageService.setItem(this.KEYS.BUDGETS, budgets);
        return newBudget;
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
        const transactions = await this.getTransactions();
        const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
            status: 'completed',
            createdAt: new Date(),
        };
        transactions.push(newTransaction);
        await storageService.setItem(this.KEYS.TRANSACTIONS, transactions);
        return newTransaction;
    }

    // ============ RESET ============
    async resetAllData(): Promise<void> {
        await storageService.clearAll();
    }
}

export const budgetStorageService = new BudgetStorageService();