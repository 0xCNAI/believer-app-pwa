/**
 * Market Insights Hook
 * Fetches pre-computed AI insights from Firebase
 */

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface MarketInsight {
    headline: string;
    url: string;
    analysis: string;
    importance: number;
    addedAt: number;
}

export interface CategoryInsights {
    category: string;
    insights: MarketInsight[];
    updatedAt: number;
}

export function useMarketInsights() {
    const [insights, setInsights] = useState<Record<string, CategoryInsights>>({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'market_insights'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: Record<string, CategoryInsights> = {};
            let latestUpdate = 0;

            snapshot.forEach((doc) => {
                const docData = doc.data() as CategoryInsights;
                data[doc.id] = docData;

                if (docData.updatedAt > latestUpdate) {
                    latestUpdate = docData.updatedAt;
                }
            });

            setInsights(data);
            setLastUpdated(latestUpdate || null);
            setLoading(false);
        }, (error) => {
            console.error('[useMarketInsights] Error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Get all insights sorted by importance
    const getAllInsights = (): MarketInsight[] => {
        const all: MarketInsight[] = [];
        Object.values(insights).forEach(cat => {
            all.push(...cat.insights);
        });
        return all.sort((a, b) => b.importance - a.importance);
    };

    // Get insights for specific categories (based on user selection)
    const getInsightsForCategories = (categories: string[]): MarketInsight[] => {
        const filtered: MarketInsight[] = [];
        categories.forEach(cat => {
            if (insights[cat]) {
                filtered.push(...insights[cat].insights);
            }
        });
        return filtered.sort((a, b) => b.importance - a.importance);
    };

    return {
        insights,
        loading,
        lastUpdated,
        getAllInsights,
        getInsightsForCategories
    };
}
