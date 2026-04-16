// hooks/use-currency.ts
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrency } from '@/store/slices/ui.slice';
import { Currency, CurrencyConfig } from '@/types';

const CURRENCIES: Record<Currency, CurrencyConfig> = {
    MGA: { code: 'MGA', symbol: 'Ar', name: 'Ariary' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    USD: { code: 'USD', symbol: '$', name: 'Dollar US' },
    GBP: { code: 'GBP', symbol: '£', name: 'Livre Sterling' },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Dollar Canadien' },
    JPY: { code: 'JPY', symbol: '¥', name: 'Yen Japonais' },
};

export const useCurrency = () => {
    const dispatch = useAppDispatch();
    const currency = useAppSelector((state) => state.ui.currency);

    const setCurrencyCode = (code: Currency) => {
        dispatch(setCurrency(code));
    };

    const formatAmount = (amount: number): string => {
        const config = CURRENCIES[currency];
        return `${config.symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    const getCurrencySymbol = (): string => CURRENCIES[currency].symbol;
    const getCurrencyCode = (): string => currency;
    const getCurrenciesList = (): CurrencyConfig[] => Object.values(CURRENCIES);

    return {
        currency,
        setCurrencyCode,
        formatAmount,
        getCurrencySymbol,
        getCurrencyCode,
        getCurrenciesList,
        isLoading: false,
    };
};