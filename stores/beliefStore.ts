import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MarketEvent, BELIEVER_SIGNALS } from '@/services/marketData';

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
    setBtcPrice: (price: number) => void;
    seedFromFocusAreas: (focusAreas: string[]) => void;

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

                set((state) => ({
                    beliefs: [
                        ...state.beliefs,
                        {
                            id: event.id,
                            marketEvent: event,
                            initialProbability: initialProb,
                            currentProbability: initialProb,
                            addedAt: Date.now(),
                        },
                    ],
                }));
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
            },

            updateBeliefs: (freshEvents) => {
                set((state) => {
                    const updatedBeliefs = state.beliefs.map(belief => {
                        const freshEvent = freshEvents.find(e => e.id === belief.id);
                        if (freshEvent && freshEvent.markets?.[0]) {
                            const newProb = parsePrice(freshEvent.markets[0].outcomePrices);
                            return { ...belief, currentProbability: newProb, marketEvent: freshEvent };
                        }
                        return belief;
                    });
                    return { beliefs: updatedBeliefs };
                });
            },

            hasInteracted: (id) => {
                const state = get();
                return state.beliefs.some(b => b.id === id) || state.discardedIds.includes(id);
            },

            getReversalIndex: () => {
                // Formula: (Tech * LiquidityModifier) + User Belief
                const { beliefs } = get();

                // 1. Technical Score (60% Base) -> Mocked 55
                // 2. Liquidity Modifier (The Amplifier)
                // For V1, we simulate this based on the "Liquidity" category events if present,
                // or default to Neutral (1.0)

                // Simple mock logic for "Background State":
                // If any Liquidity event > 50%, we say Improving. Else Neutral/Tight.
                // In production this would come from a dedicated "Regime Signal".

                const liqEvents = BELIEVER_SIGNALS.filter(e => e.category === 'Liquidity');
                // Mock: Assume 1 Improving event exists
                const liquidityStatus: string = 'neutral';
                const modifier = liquidityStatus === 'improving' ? 1.2 : (liquidityStatus === 'tight' ? 0.8 : 1.0);

                const techComponent = (55 * 0.6) * modifier; // Base ~33, modified up/down

                // 3. User Belief Score (40%)
                let userComponent = 20;

                if (beliefs.length > 0) {
                    const totalProb = beliefs.reduce((sum, b) => sum + b.currentProbability, 0);
                    const avgProb = totalProb / beliefs.length; // 0-100
                    userComponent = avgProb * 0.4; // Max 40
                }

                // Cap at 100
                return Math.min(100, techComponent + userComponent);
            },

            getInterpretation: () => {
                const index = get().getReversalIndex();
                // Access user prefs directly from store (outside React hook)
                const { experience } = require('./userStore').useUserStore.getState();

                // Calibrated Interpretation based on Experience Level
                // 1. Conservative (Novice/No Exp) - Focus on basic structure
                if (experience === 'none' || !experience) {
                    if (index < 40) return "觀察基礎結構：賣壓仍重，尚未築底。";
                    if (index < 60) return "觀察基礎結構：處於修復期，靜待方向明確。";
                    return "觀察基礎結構：底部型態確立，正向發展。";
                }

                // 2. Balanced (1-3 Years) - Focus on momentum
                if (experience === '1-3_years') {
                    if (index < 40) return "觀察中期動能：趨勢向下，等待止跌訊號。";
                    if (index < 60) return "觀察中期動能：動能中性，留意關鍵點位突破。";
                    return "觀察中期動能：多頭動能增強，趨勢延續中。";
                }

                // 3. Sensitive (5+ Years) - Focus on multi-frame/details
                if (experience === '5_plus_years') {
                    if (index < 40) return "微觀結構掃描：流動性緊縮，尋找極端錯價。";
                    if (index < 60) return "微觀結構掃描：多空博弈激烈，等待主力表態。";
                    return "微觀結構掃描：結構性買盤進駐，Alpha 機會浮現。";
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
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
