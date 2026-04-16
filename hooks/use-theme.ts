// hooks/use-theme.ts
import { useEffect, useState, useRef } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, toggleTheme as toggleThemeAction } from '@/store/slices/ui.slice';
import { Colors } from '@/constants/theme';
import { storageService } from '@/hooks/use-storage';

export const useTheme = () => {
    const systemColorScheme = useNativeColorScheme();
    const dispatch = useAppDispatch();
    const theme = useAppSelector((state) => state.ui?.theme || 'light');
    const [isLoading, setIsLoading] = useState(true);
    const [colors, setColors] = useState(Colors.light);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        const loadTheme = async () => {
            try {
                // Utiliser storageService au lieu de localStorage
                const savedTheme: 'light' | 'dark' | null = await storageService.getItem<'light' | 'dark'>('theme');
                let activeTheme: 'light' | 'dark' = 'light';

                if (savedTheme === 'light' || savedTheme === 'dark') {
                    activeTheme = savedTheme;
                } else if (systemColorScheme === 'light' || systemColorScheme === 'dark') {
                    activeTheme = systemColorScheme;
                }

                // Ne dispatcher que si différent
                if (activeTheme !== theme) {
                    dispatch(setTheme(activeTheme));
                }
                setColors(Colors[activeTheme]);
            } catch (error) {
                console.error('Error loading theme:', error);
                setColors(Colors.light);
            } finally {
                setIsLoading(false);
            }
        };

        loadTheme();
    }, [dispatch, systemColorScheme, theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        dispatch(toggleThemeAction());
        setColors(Colors[newTheme]);
    };

    // Mettre à jour colors quand theme change
    useEffect(() => {
        if (!isLoading) {
            setColors(Colors[theme]);
        }
    }, [theme, isLoading]);

    return {
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        isLoading,
        colors,
    };
};