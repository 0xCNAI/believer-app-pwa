import { BELIEVER_SIGNALS, MarketEvent, fetchUnifiedMarkets } from '@/services/marketData';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Belief {
    id: string;
    marketEvent: MarketEvent;
    initialProbability: number;
    currentProbability: number;
    addedAt: number;
}

interface BeliefState {
    beliefs: Belief[];
    discardedIds: string[];
    faithClicks: number;
    btcPrice: number;

    // Actions
    addBelief: (event: MarketEvent) => void;
    discardEvent: (id: string) => void;
    removeBelief: (id: string) => void;
    incrementFaith: () => void;
    updateBeliefs: (freshEvents: MarketEvent[]) => void;
    refreshBeliefs: () => Promise<void>;
    setBtcPrice: (price: number) => void;
    seedFromFocusAreas: (focusAreas: string[]) => void;
    syncBeliefs: (userId: string) => () => void; // Returns unsubscribe function

    // Getters
    hasInteracted: (id: string) => boolean;
    getReversalIndex: () => number; // Previously Bull Score
    getInterpretation: () => string;
    getStats: () => { believed: number, seen: number };
}

const parsePrice = (prices: string[] | string): number => {
    let priceStr = "0";
    try {
        if (Array.isArray(prices)) {
            priceStr = prices[0];
        } else if (typeof prices === 'string') {
            const p = JSON.parse(prices);
            priceStr = p[0];
        }
        return parseFloat(priceStr) * 100;
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
            btcPrice: 94500, // Initial Mock Price for Anchor

            incrementFaith: () => set((state) => ({ faithClicks: state.faithClicks + 1 })),
            setBtcPrice: (price) => set({ btcPrice: price }),

            seedFromFocusAreas: (focusAreas) => {
                const state = get();
                const existingIds = new Set(state.beliefs.map(b => b.id));
                const newBeliefs: Belief[] = [];

                // Simple Strategy: Pick 1 top event for each focus area
                focusAreas.forEach(area => {
                    let targetCategory = '';
                    if (area === 'macro') targetCategory = 'Macro'; // Or Liquidity
                    if (area === 'extreme_repair') targetCategory = 'Risk';
                    if (area === 'btc_structure') targetCategory = 'Supply';
                    if (area === 'policy') targetCategory = 'Political';
                    if (area === 'low_prob') targetCategory = 'Narrative';

                    // Find first event in this category not already added
                    const candidate = BELIEVER_SIGNALS.find(e =>
                        e.category === targetCategory && !existingIds.has(e.id)
                    );

                    if (candidate && candidate.markets?.[0]) {
                        const initialProb = parsePrice(candidate.markets[0].outcomePrices);
                        newBeliefs.push({
                            id: candidate.id,
                            marketEvent: candidate,
                            initialProbability: initialProb,
                            currentProbability: initialProb,
                            addedAt: Date.now(),
                        });
                        existingIds.add(candidate.id);
                    }
                });

                if (newBeliefs.length > 0) {
                    set((prev) => ({
                        beliefs: [...prev.beliefs, ...newBeliefs]
                    }));
                }
            },

            addBelief: (event) => {
                const market = event.markets?.[0];
                if (!market) return;

                const initialProb = parsePrice(market.outcomePrices);
                const newBelief = {
                    id: event.id,
                    marketEvent: event,
                    initialProbability: initialProb,
                    currentProbability: initialProb,
                    addedAt: Date.now(),
                };

                set((state) => ({
                    beliefs: [...state.beliefs, newBelief],
                }));

                // Firestore Sync
                const { user } = require('./authStore').useAuthStore.getState();
                if (user?.id) {
                    import('@/services/firebase').then(({ db }) => {
                        import('firebase/firestore').then(({ doc, setDoc }) => {
                            setDoc(doc(db, `users/${user.id}/reversal_index`, event.id), newBelief)
                                .then(() => console.log("Write success"))
                                .catch((err) => {
                                    console.error("Firestore Write Error:", err);
                                    alert(`Save Failed: ${err.message}`);
                                });
                        });
                    });
                } else {
                    alert("User ID missing. ignoring save.");
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
                const { user } = require('./authStore').useAuthStore.getState();
                if (user?.id) {
                    import('@/services/firebase').then(({ db }) => {
                        import('firebase/firestore').then(({ doc, deleteDoc }) => {
                            deleteDoc(doc(db, `users/${user.id}/reversal_index`, id));
                        });
                    });
                }
            },

            updateBeliefs: (freshEvents) => {
                set((state) => {
                    const updatedBeliefs = state.beliefs.map(belief => {
                        const freshEvent = freshEvents.find(e => e.id === belief.id);
                        if (freshEvent && freshEvent.markets?.[0]) {
                            const newProb = parsePrice(freshEvent.markets[0].outcomePrices);
                            const updated = { ...belief, currentProbability: newProb, marketEvent: freshEvent };

                            // Passive Sync (Optional: Update DB if price changed)
                            const { user } = require('./authStore').useAuthStore.getState();
                            if (user?.id) {
                                import('@/services/firebase').then(({ db }) => {
                                    import('firebase/firestore').then(({ doc, setDoc }) => {
                                        setDoc(doc(db, `users/${user.id}/reversal_index`, belief.id), updated, { merge: true });
                                    });
                                });
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
                    // Get current user prefs for optimal fetching
                    // const { experience } = require('./userStore').useUserStore.getState();
                    // Just fetch default for now to get fresh prices
                    const freshEvents = await fetchUnifiedMarkets();
                    get().updateBeliefs(freshEvents);
                    console.log('[BeliefStore] Refreshed beliefs with live data');
                } catch (e) {
                    console.error('[BeliefStore] Failed to refresh beliefs:', e);
                }
            },

            syncBeliefs: (userId: string) => {
                // Return existing or new subscriber
                const { db } = require('@/services/firebase');
                const { collection, onSnapshot, query } = require('firebase/firestore');

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
