// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import dataReducer from './slices/data.slice';
import uiReducer from './slices/ui.slice';

export const store = configureStore({
    reducer: {
        data: dataReducer,
        ui: uiReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;