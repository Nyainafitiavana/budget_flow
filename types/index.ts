export type AccountType = 'bank' | 'cash' | 'savings';

export interface Account {
    id: string;
    name: string;
    bankName?: string;
    type: AccountType;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Budget {
    id: string;
    name: string;
    amount: number;
    spent: number;
    remaining: number;
    color: string;
    startDate: Date;
    endDate: Date;
    isClosed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    operation: string;
    source: string;
    destination: string;
    amount: number;
    budgetId?: string;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    date: Date;
    createdAt: Date;
}

export type Currency = 'MGA' | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'JPY';

export interface CurrencyConfig {
    code: Currency;
    symbol: string;
    name: string;
}