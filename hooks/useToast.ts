// hooks/useToast.ts
import { useState, useCallback } from 'react';

interface ToastState {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = () => {
    const [toastState, setToastState] = useState<ToastState>({
        visible: false,
        message: '',
        type: 'success',
    });

    const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
        console.log('📢 showToast appelé:', message, type);
        setToastState({ visible: true, message, type });
    }, []);

    const hideToast = useCallback(() => {
        console.log('📢 hideToast appelé');
        setToastState(prev => ({ ...prev, visible: false }));
    }, []);

    return {
        showToast,
        hideToast,
        toastState,
    };
};