// components/theme-provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { storageService } from '@/hooks/use-storage';
import { Colors } from '@/constants/theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    toggleTheme: () => void;
    setThemeMode: (theme: ThemeType) => void;
    isDark: boolean;
    colors: typeof Colors.light | typeof Colors.dark;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useNativeColorScheme();
    const [theme, setTheme] = useState<ThemeType>('light');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await storageService.getItem<ThemeType>('theme');
            if (savedTheme) {
                setTheme(savedTheme);
            } else {
                setTheme(systemColorScheme || 'light');
            }
        } catch (error) {
            console.error('Error loading theme:', error);
            setTheme('light');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        await storageService.setItem('theme', newTheme);
    };

    const setThemeMode = async (newTheme: ThemeType) => {
        setTheme(newTheme);
        await storageService.setItem('theme', newTheme);
    };

    const colors = Colors[theme];

    return (
        <ThemeContext.Provider
            value={{
        theme,
            toggleTheme,
            setThemeMode,
            isDark: theme === 'dark',
            colors,
            isLoading,
    }}>
    {children}
    </ThemeContext.Provider>
);
};

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};