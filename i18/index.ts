// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const resources = {
    fr: { translation: fr },
    en: { translation: en },
};

const LANGUAGE_KEY = 'app_language';

export const changeLanguage = async (lang: string) => {
    // eslint-disable-next-line import/no-named-as-default-member
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export const getStoredLanguage = async (): Promise<string> => {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return savedLang || 'en';
};

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;