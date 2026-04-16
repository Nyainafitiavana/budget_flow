// store/slices/ui.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storageService } from '@/hooks/use-storage';
import { Currency } from '@/types';

interface UiState {
    theme: 'light' | 'dark';
    currency: Currency;
}

const initialState: UiState = {
    theme: 'light',
    currency: 'MGA',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload;
            void storageService.setItem('theme', action.payload);
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            void storageService.setItem('theme', state.theme);
        },
        setCurrency: (state, action: PayloadAction<Currency>) => {
            state.currency = action.payload;
            void storageService.setItem('currency', action.payload);
        },
    },
});

export const { setTheme, toggleTheme, setCurrency } = uiSlice.actions;
export default uiSlice.reducer;