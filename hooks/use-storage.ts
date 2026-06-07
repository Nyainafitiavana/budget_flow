// hooks/use-storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StorageKeys =
    | 'theme'
    | 'pinCode'
    | 'pinEnabled'
    | 'budgets'
    | 'accounts'
    | 'transactions'
    | 'currency'
    | 'isLicensed'
    | 'licensedAt'
    | 'deviceCode';

class StorageService {
    async setItem(key: StorageKeys, value: any): Promise<void> {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
            console.log(`✅ Saved: ${key} =`, value);
        } catch (error) {
            console.error(`❌ Error saving ${key}:`, error);
        }
    }

    async getItem<T>(key: StorageKeys): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            if (value !== null) {
                const parsed = JSON.parse(value);
                console.log(`📖 Read: ${key} =`, parsed);
                return parsed as T;
            }
            console.log(`⚠️ No data for: ${key}`);
            return null;
        } catch (error) {
            console.error(`❌ Error reading ${key}:`, error);
            return null;
        }
    }

    async removeItem(key: StorageKeys): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed: ${key}`);
        } catch (error) {
            console.error(`❌ Error removing ${key}:`, error);
        }
    }

    async clearAll(): Promise<void> {
        try {
            const keys: StorageKeys[] = ['theme', 'pinCode', 'pinEnabled', 'budgets', 'accounts', 'transactions', 'currency', 'isLicensed', 'licensedAt', 'deviceCode'];
            for (const key of keys) {
                await AsyncStorage.removeItem(key);
            }
            console.log('✅ All data cleared');
        } catch (error) {
            console.error('❌ Error clearing data:', error);
        }
    }
}

export const storageService = new StorageService();