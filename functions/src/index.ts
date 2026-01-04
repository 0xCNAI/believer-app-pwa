/**
 * Central AI News System - Firebase Cloud Function
 * Runs every 3 hours to fetch and analyze market news
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { fetchNewsForCategory } from './newsService';
import { evaluateAndMergeInsights } from './aiEvaluator';

admin.initializeApp();
const db = admin.firestore();

// Market Categories
const CATEGORIES = ['Macro', 'Structural', 'Political', 'Narrative'] as const;

/**
 * Scheduled function - runs every 3 hours
 * Fetches news, evaluates importance, stores top 3 per category
 */
export const updateMarketInsights = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .pubsub.schedule('every 3 hours')
    .onRun(async (context) => {
        console.log('[Central AI] Starting market insights update...');

        for (const category of CATEGORIES) {
            try {
                console.log(`[Central AI] Processing category: ${category}`);

                // 1. Get existing insights
                const existingDoc = await db.collection('market_insights').doc(category).get();
                const existingInsights = existingDoc.exists
                    ? existingDoc.data()?.insights || []
                    : [];

                // 2. Fetch new news for this category
                const newNews = await fetchNewsForCategory(category);

                // 3. Evaluate and merge with existing (keep top 3)
                const mergedInsights = await evaluateAndMergeInsights(
                    existingInsights,
                    newNews,
                    category
                );

                // 4. Save to Firestore
                await db.collection('market_insights').doc(category).set({
                    category,
                    insights: mergedInsights.slice(0, 3),
                    updatedAt: Date.now()
                });

                console.log(`[Central AI] Updated ${category}: ${mergedInsights.length} insights`);

            } catch (error) {
                console.error(`[Central AI] Error processing ${category}:`, error);
            }
        }

        console.log('[Central AI] Market insights update complete.');
        return null;
    });

/**
 * HTTP trigger for manual testing
 */
export const triggerMarketInsightsUpdate = functions.https.onRequest(async (req, res) => {
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        res.status(401).send('Unauthorized');
        return;
    }

    try {
        // Run the same logic as scheduled function
        for (const category of CATEGORIES) {
            const existingDoc = await db.collection('market_insights').doc(category).get();
            const existingInsights = existingDoc.exists
                ? existingDoc.data()?.insights || []
                : [];

            const newNews = await fetchNewsForCategory(category);
            const mergedInsights = await evaluateAndMergeInsights(
                existingInsights,
                newNews,
                category
            );

            await db.collection('market_insights').doc(category).set({
                category,
                insights: mergedInsights.slice(0, 3),
                updatedAt: Date.now()
            });
        }

        res.status(200).json({ success: true, message: 'Market insights updated' });
    } catch (error: any) {
        console.error('[Manual Trigger] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
