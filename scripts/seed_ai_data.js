
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    // Try to auto-initialize or use default creds
    admin.initializeApp();
}
const db = admin.firestore();

const CATEGORIES = ['Macro', 'Structural', 'Political', 'Narrative'];

async function run() {
    console.log('Starting Manual AI Trigger (JS Mode)...');

    // 1. Create Dummy Data
    const timestamp = Date.now();

    for (const category of CATEGORIES) {
        console.log(`Updating Category: ${category}`);

        const demoInsight = {
            headline: `Manual Trigger Update: ${category} Market Analysis`,
            url: 'https://polymarket.com',
            analysis: `川普重申支持戰略儲備，市場預期法案通過機率顯著提升。`,
            importance: 10,
            signalId: 'btc_reserve', // Test Signal ID linkage
            addedAt: timestamp
        };

        const docRef = db.collection('market_insights').doc(category);
        await docRef.set({
            category,
            insights: [demoInsight],
            updatedAt: timestamp
        });

        console.log(` - Updated ${category}`);
    }

    console.log('Done! Verify in App.');
}

run().catch(console.error);
