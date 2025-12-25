import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

export const safeStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null;
        return await AsyncStorage.getItem(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        return await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        return await AsyncStorage.removeItem(name);
    },
};
