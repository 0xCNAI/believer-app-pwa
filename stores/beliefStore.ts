import { BELIEVER_SIGNALS, NarrativeSignal, fetchUnifiedMarkets, getPositiveProbability } from '@/services/marketData';
import { PredictionTopic } from '@/stores/userStore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { db } from '@/services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { syncUserMerit } from '@/services/meritService';

export interface Belief {
    id: string;
    signal: NarrativeSignal; // Renamed from marketEvent for clarity
    currentProbability: number;
    addedAt: number;
}

interface BeliefState {
    beliefs: Belief[];
    discardedIds: string[];
    faithClicks: number;
    pendingMerit?: number;
    btcPrice: number;

    addBelief: (event: NarrativeSignal) => void;
    discardEvent: (id: string) => void;
    removeBelief: (id: string) => void;
    incrementFaith: () => void;
    updateBeliefs: (freshEvents: NarrativeSignal[]) => void;
    refreshBeliefs: () => Promise<void>;
    cleanupStaleBeliefs: () => void;
    setBtcPrice: (price: number) => void;
    seedFromPredictionTopics: (topics: PredictionTopic[]) => void;
    syncBeliefs: (userId: string) => () => void;
    resetStore: () => void;
    fetchUserMerit: (userId: string) => Promise<void>;

    hasInteracted: (id: string) => boolean;
    getReversalIndex: () => number;
    getInterpretation: () => string;
    getStats: () => { believed: number, seen: number };
}

export const useBeliefStore = create<BeliefState>()(
    persist(
        (set, get) => ({
            beliefs: [],
            discardedIds: [],
            faithClicks: 0,
            pendingMerit: 0,
            btcPrice: 94500,

            incrementFaith: () => {
                set((state) => ({
                    faithClicks: state.faithClicks + 1,
                    pendingMerit: (state.pendingMerit || 0) + 1
                }));
                // ... (Merit Sync logic unchanged, omitted for brevity) ...
                if ((get() as any)._flushTimeout) clearTimeout((get() as any)._flushTimeout);
                const timeout = setTimeout(() => {
                    const { pendingMerit } = get();
                    if (pendingMerit && pendingMerit > 0) {
                        const { user } = useAuthStore.getState();
                        if (user?.id) {
                            const { faithClicks } = get();
                            const displayName = user.name || `User ${user.id.slice(0, 4)}`;
                            syncUserMerit(user.id, displayName, faithClicks);
                            set({ pendingMerit: 0 });
                        }
                    }
                }, 3000);
                set({ _flushTimeout: timeout } as any);
            },
            setBtcPrice: (price) => set({ btcPrice: price }),

            seedFromPredictionTopics: (topics) => {
                const state = get();
                const existingIds = new Set(state.beliefs.map(b => b.id));
                const newBeliefs: Belief[] = [];

                // V5.0: Map topics to Hardcoded NarrativeSignals
                // Topic -> Signal IDs
                const topicToSignalIds: Record<PredictionTopic, string[]> = {
                    'monetary_policy': ['fed_decision'],
                    'macro_downturn': ['us_recession'],
                    'fiscal_credit': ['gov_shutdown', 'us_debt_default'],
                    'sovereign_btc': ['btc_reserve'],
                    'financial_stability': ['us_bank_failure_by_mar31_2026'], // Might need to check if this exists in V5 BELIEVER_SIGNALS
                };

                topics.forEach(topic => {
                    topicToSignalIds[topic]?.forEach(signalId => {
                        if (!existingIds.has(signalId)) {
                            const candidate = BELIEVER_SIGNALS.find(s => s.id === signalId);
                            if (candidate) {
                                // Calculate Initial Prob
                                const prob = getPositiveProbability(candidate);
                                newBeliefs.push({
                                    id: candidate.id,
                                    signal: candidate,
                                    currentProbability: prob,
                                    addedAt: Date.now(),
                                });
                                existingIds.add(candidate.id);
                            }
                        }
                    });
                });

                if (newBeliefs.length > 0) {
                    set((prev) => ({
                        beliefs: [...prev.beliefs, ...newBeliefs]
                    }));
                }
            },

            addBelief: (signal) => {
                const prob = getPositiveProbability(signal);
                const newBelief = {
                    id: signal.id,
                    signal: signal, // V5
                    currentProbability: prob,
                    addedAt: Date.now(),
                };

                set((state) => ({
                    beliefs: [...state.beliefs, newBelief],
                }));

                const { user } = useAuthStore.getState();
                if (user?.id) {
                    setDoc(doc(db, `users/${user.id}/reversal_index`, signal.id), newBelief)
                        .catch(console.error);
                }
            },

            discardEvent: (id) => {
                set((state) => ({ discardedIds: [...state.discardedIds, id] }));
            },

            removeBelief: (id) => {
                set((state) => ({ beliefs: state.beliefs.filter((b) => b.id !== id) }));
                const { user } = useAuthStore.getState();
                if (user?.id) deleteDoc(doc(db, `users/${user.id}/reversal_index`, id));
            },

            updateBeliefs: (freshEvents) => {
                set((state) => {
                    const updatedBeliefs = state.beliefs.map(belief => {
                        const freshSignal = freshEvents.find(e => e.id === belief.id);
                        if (freshSignal) {
                            const newProb = getPositiveProbability(freshSignal);
                            // Only update if changed significantly? 
                            // Or always update to keep UI fresh.
                            return { ...belief, currentProbability: newProb, signal: freshSignal };
                        }
                        return belief;
                    });
                    return { beliefs: updatedBeliefs };
                });
            },

            const parsePrice = (prices: string[] | string): number => {
                let priceStr = "0";
                try {
                    if (Array.isArray(prices)) {
                        priceStr = prices[0];
                    } else if (typeof prices === 'string') {
                        const p = JSON.parse(prices);
                        priceStr = p[0];
                    }
                    // Return 0-1 scale, NOT multiplied by 100
                    return Math.max(0, Math.min(1, parseFloat(priceStr)));
                } catch (e) {
                    return 0;
                }
            };

            export const useBeliefStore = create<BeliefState>()(
                persist(
                    (set, get) => ({
                        beliefs: [],
                        discardedIds: [],
                        faithClicks: 0,
                        pendingMerit: 0,
                        btcPrice: 94500, // Initial Mock Price for Anchor

                        incrementFaith: () => {
                            set((state) => ({
                                faithClicks: state.faithClicks + 1,
                                pendingMerit: (state.pendingMerit || 0) + 1
                            }));

                            // Debounced Sync
                            if ((get() as any)._flushTimeout) clearTimeout((get() as any)._flushTimeout);

                            const timeout = setTimeout(() => {
                                const { pendingMerit } = get();
                                if (pendingMerit && pendingMerit > 0) {
                                    const { user } = useAuthStore.getState();
                                    if (user?.id) {
                                        const { faithClicks } = get();
                                        // Default display name if missing
                                        const displayName = user.name || `User ${user.id.slice(0, 4)}`;
                                        syncUserMerit(user.id, displayName, faithClicks);
                                        set({ pendingMerit: 0 });
                                    }
                                }
                            }, 3000); // 3s debounce

                            set({ _flushTimeout: timeout } as any);
                        },
                        setBtcPrice: (price) => set({ btcPrice: price }),

                        // V5.0: Seed from Prediction Topics
                        seedFromPredictionTopics: (topics) => {
                            const state = get();
                            const existingIds = new Set(state.beliefs.map(b => b.id));
                            const newBeliefs: Belief[] = [];

                            // Map topics to 7 signal IDs (V5.0)
                            const topicToSignalIds: Record<PredictionTopic, string[]> = {
                                'monetary_policy': ['fed_decision'],
                                'macro_downturn': ['us_recession'],
                                'fiscal_credit': ['gov_shutdown', 'us_debt_default'],
                                'sovereign_btc': ['btc_reserve'],
                                'financial_stability': ['us_bank_failure_by_mar31_2026'], // Check if exists
                            };

                            topics.forEach(topic => {
                                topicToSignalIds[topic]?.forEach(signalId => {
                                    if (!existingIds.has(signalId)) {
                                        const candidate = BELIEVER_SIGNALS.find(s => s.id === signalId);
                                        if (candidate) {
                                            const prob = getPositiveProbability(candidate);
                                            newBeliefs.push({
                                                id: candidate.id,
                                                signal: candidate,
                                                currentProbability: prob,
                                                addedAt: Date.now(),
                                            });
                                            existingIds.add(candidate.id);
                                        }
                                    }
                                });
                            });

                            if (newBeliefs.length > 0) {
                                set((prev) => ({
                                    beliefs: [...prev.beliefs, ...newBeliefs]
                                }));
                            }
                        },

                        addBelief: (event) => {
                            const prob = getPositiveProbability(event);
                            const newBelief: Belief = {
                                id: event.id,
                                signal: event,
                                currentProbability: prob,
                                addedAt: Date.now(),
                            };

                            set((state) => ({
                                beliefs: [...state.beliefs, newBelief],
                            }));

                            // Firestore Sync
                            const { user } = useAuthStore.getState();
                            if (user?.id) {
                                setDoc(doc(db, `users/${user.id}/reversal_index`, event.id), newBelief)
                                    .then(() => console.log("Write success"))
                                    .catch((err) => {
                                        console.error("Firestore Write Error:", err);
                                    });
                            }
                        },

                        discardEvent: (id) => {
                            set((state) => ({
                                discardedIds: [...state.discardedIds, id]
                            }));
                        },

                        removeBelief: (id) => {
                            set((state) => ({
                                beliefs: state.beliefs.filter((b) => b.id !== id),
                            }));
                            // Firestore Sync
                            const { user } = useAuthStore.getState();
                            if (user?.id) {
                                deleteDoc(doc(db, `users/${user.id}/reversal_index`, id));
                            }
                        },

                        updateBeliefs: (freshEvents) => {
                            set((state) => {
                                const updatedBeliefs = state.beliefs.map(belief => {
                                    const freshSignal = freshEvents.find(e => e.id === belief.id);
                                    if (freshSignal) {
                                        const newProb = getPositiveProbability(freshSignal);
                                        const updated = { ...belief, currentProbability: newProb, signal: freshSignal };

                                        // Passive Sync (Optional: Update DB if price changed)
                                        const { user } = useAuthStore.getState();
                                        if (user?.id) {
                                            setDoc(doc(db, `users/${user.id}/reversal_index`, belief.id), updated, { merge: true });
                                        }
                                        return updated;
                                    }
                                    return belief;
                                });
                                return { beliefs: updatedBeliefs };
                            });
                        },

                        refreshBeliefs: async () => {
                            try {
                                get().cleanupStaleBeliefs();
                                const freshEvents = await fetchUnifiedMarkets([]);
                                get().updateBeliefs(freshEvents);
                                console.log('[BeliefStore] Refreshed beliefs with live data');
                            } catch (e) {
                                console.error('[BeliefStore] Failed to refresh beliefs:', e);
                            }
                        },

                        cleanupStaleBeliefs: () => {
                            const validIds = new Set(BELIEVER_SIGNALS.map(s => s.id));
                            set((state) => {
                                const cleanedBeliefs = state.beliefs.filter(b => validIds.has(b.id));
                                return { beliefs: cleanedBeliefs };
                            });
                        },

                        syncBeliefs: (userId: string) => {
                            const { collection, onSnapshot, query } = require('firebase/firestore');
                            const q = query(collection(db, `users/${userId}/reversal_index`));
                            return onSnapshot(q, (snapshot: any) => {
                                const loaded: Belief[] = [];
                                snapshot.forEach((doc: any) => loaded.push(doc.data() as Belief));
                                set({ beliefs: loaded });
                            });
                        },

                        const q = query(collection(db, `users/${userId}/reversal_index`));
                        const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
                            const remoteBeliefs: Belief[] = [];
                            querySnapshot.forEach((doc: any) => {
                                remoteBeliefs.push(doc.data() as Belief);
                            });

                            // Merge remote with local? Or just replace?
                            // For simplicity, Firestore is source of truth if we are syncing.
                            set({ beliefs: remoteBeliefs });
                        });
                        return unsubscribe;
                    },

                        resetStore: () => {
                            set({
                                beliefs: [],
                                faithClicks: 0,
                                pendingMerit: 0,
                                discardedIds: []
                            });
                        },

                    fetchUserMerit: async (userId: string) => {
                        const { db } = require('@/services/firebase');
                        const { doc, getDoc } = require('firebase/firestore');
                        try {
                            const snap = await getDoc(doc(db, 'users', userId));
                            if (snap.exists()) {
                                const data = snap.data();
                                console.log('[BeliefStore] Synced merit from DB:', data.merit || 0);
                                set({ faithClicks: data.merit || 0 });
                            }
                        } catch (e) {
                            console.error('[BeliefStore] Failed to fetch user merit:', e);
                        }
                    },

                    hasInteracted: (id) => {
                        const state = get();
                        return state.beliefs.some(b => b.id === id) || state.discardedIds.includes(id);
                    },

                    getReversalIndex: () => {
                        // V2.0: Dual-Track Score from TechStore
                        try {
                            const techState = require('./techStore').useTechStore.getState();
                            return techState.reversalState?.finalScore ?? 0;
                        } catch (e) {
                            return 0;
                        }
                    },

                    getInterpretation: () => {
                        // Access user prefs directly from store
                        const { experience } = require('./userStore').useUserStore.getState();

                        // Get Stage from TechStore
                        let stage = 'Bottom Break';
                        try {
                            const techState = require('./techStore').useTechStore.getState();
                            stage = techState.reversalState?.stage ?? 'Bottom Break';
                        } catch (e) { }

                        // Calibrated Interpretation based on Experience Level
                        // 1. Conservative (Novice/No Exp)
                        if (experience === 'none' || !experience) {
                            if (stage === 'Bottom Break') return "觀察基礎結構：賣壓仍重，尚未築底。";
                            if (stage === 'Watch') return "觀察基礎結構：底部初現，進入觀察清單。";
                            if (stage === 'Prepare') return "觀察基礎結構：反轉結構成型，準備進場。";
                            return "觀察基礎結構：趨勢確認反轉，正向發展。";
                        }

                        // 2. Balanced (1-3 Years)
                        if (experience === '1-3_years') {
                            if (stage === 'Bottom Break') return "觀察中期動能：趨勢向下，切勿接刀。";
                            if (stage === 'Watch') return "觀察中期動能：動能減弱，留意止跌訊號。";
                            if (stage === 'Prepare') return "觀察中期動能：多頭動能轉強，嘗試建倉。";
                            return "觀察中期動能：趨勢反轉確認，順勢操作。";
                        }

                        // 3. Sensitive (5+ Years)
                        if (experience === '5_plus_years') {
                            if (stage === 'Bottom Break') return "微觀結構掃描：流動性緊縮，尋找極端錯價。";
                            if (stage === 'Watch') return "微觀結構掃描：Smart Money 潛伏，監控異常量能。";
                            if (stage === 'Prepare') return "微觀結構掃描：結構性買盤進駐，Alpha 機會浮現。";
                            return "微觀結構掃描：主升段啟動，擴大曝險。";
                        }

                        return "系統等待校準中...";
                    },

                    getStats: () => {
                        const { beliefs, discardedIds } = get();
                        return {
                            believed: beliefs.length,
                            seen: beliefs.length + discardedIds.length
                        };
                    }
                    }),
        {
            name: 'belief-storage',
            storage: createJSONStorage(() => require('@/utils/storage').safeStorage),
        }
    )
);
