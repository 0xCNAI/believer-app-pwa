import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
    id: string;
    type: 'SYSTEM' | 'VOLATILITY' | 'PHASE' | 'WEEKLY';
    content: string;
    timestamp: number;
    read: boolean;
}

interface NotificationState {
    notifications: NotificationItem[];
    unreadCount: number;
    addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [
                // Initial System Message (Simulated as persistent for now)
                {
                    id: 'sys-init',
                    type: 'SYSTEM',
                    content: 'UI V5.4 全中文化版本已上線。',
                    timestamp: Date.now(),
                    read: false
                }
            ],
            unreadCount: 1,

            addNotification: (item) => {
                set((state) => {
                    const newItem: NotificationItem = {
                        ...item,
                        id: Math.random().toString(36).substring(7),
                        timestamp: Date.now(),
                        read: false,
                    };
                    return {
                        notifications: [newItem, ...state.notifications],
                        unreadCount: state.unreadCount + 1,
                    };
                });
            },

            markAsRead: (id) => {
                set((state) => {
                    const newNotifs = state.notifications.map(n =>
                        n.id === id ? { ...n, read: true } : n
                    );
                    const unread = newNotifs.filter(n => !n.read).length;
                    return { notifications: newNotifs, unreadCount: unread };
                });
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0
                }));
            },

            clearAll: () => {
                set({ notifications: [], unreadCount: 0 });
            }
        }),
        {
            name: 'notification-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
