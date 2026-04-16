// hooks/use-budget-data.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadAllData, initializeDefaultData } from '@/store/slices/data.slice';
import { budgetStorageService } from '@/services/storage.service';

export const useBudgetData = () => {
    const dispatch = useAppDispatch();
    const { accounts, budgets, transactions, isLoading } = useAppSelector((state) => state.data);

    useEffect(() => {
        // Initialiser les données par défaut puis charger
        const init = async () => {
            await dispatch(initializeDefaultData()).unwrap();
        };
        init();
    }, [dispatch]);

    const refreshData = () => {
        dispatch(loadAllData());
    };

    return {
        accounts,
        budgets,
        transactions,
        isLoading,
        refreshData,
        budgetStorageService,
    };
};