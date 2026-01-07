
// Standalone script to simulate Firebase Email Trigger
// Bypasses TS aliases and Jest dependencies by mocking logic directly

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// 1. Initialize Firebase (Mocking config if file access fails, or using direct envs if available)
// Since we are inside the project, we should try to load the real config if possible, 
// but for a robust script, I'll assume standard processing.
// Wait, I can just import from the real file if I use relative path and it doesn't use aliases.
// But better to be safe.

// !!! REPLACE WITH YOUR PROJECT CONFIG IF NEEDED !!!
// For this environment, I will try to read the env vars or just use a placeholder 
// and assume the user's environment might have them, OR relying on 'default' app if initialized.
// Actually, reading services/firebase.ts content first is safer. 
// CHECKING services/firebase.ts content in previous step... taking a guess it uses process.env.

// Let's assume services/firebase.ts works if I fix relative paths.
// But to be 100% sure, I will paste the logic here, assuming I can see the config in viewing.
// If I can't see config, I will try to import it.

// Let's try importing logic first using relative paths which ts-node handles if no aliases.
// The file services/emailService imports '@/stores/authStore' which WILL FAIL.
// So I MUST COPY-PASTE logic.

// --- MOCK / COPY-PASTE DEPENDENCIES ---

// Mock Email Generator (from mockEmailService.ts)
const generateEmailHtml = (type: string, data: any) => {
    switch (type) {
        case 'STAGE_UPGRADE':
            return {
                subject: `🔔 Market Status Update: Entering [${data.stage}] Phase`,
                html: `<h1>New Phase: ${data.stage}</h1><p>Score: ${data.score}</p>`
            };
        default: return { subject: 'Test Email', html: 'Test Content' };
    }
};

async function run() {
    // Dynamic import to handle potential ESM/CJS issues if needed, but standard import above is fine for ts-node often.
    // However, I need the REAL db instance.
    // Importing './../services/firebase' might work if IT doesn't use aliases.

    // Attempting to import the real firebase init
    const { db } = require('../services/firebase');

    console.log('[EmailService] Triggering Firebase Email Extension via Firestore...');

    const recipient = '0xcryptonewsi@gmail.com';
    const type = 'STAGE_UPGRADE';
    const data = {
        recipientName: 'CryptoNews AI',
        stage: 'PREPARE',
        score: 65,
        gatesPassed: 3,
        cycleZone: 'STRONG'
    };

    const { subject, html } = generateEmailHtml(type, data);

    const mailPayload = {
        to: [recipient],
        message: {
            subject: subject,
            html: html,
        },
        delivery: {
            state: 'PENDING',
            attempts: 0
        },
        metadata: {
            type,
            userId: 'admin_script_test',
            createdAt: Date.now()
        }
    };

    try {
        const docRef = await addDoc(collection(db, 'mail'), mailPayload);
        console.log(`[EmailService] SUCCESS. Email queued in Firestore.`);
        console.log(`[EmailService] Document ID: ${docRef.id}`);
        console.log(`[EmailService] Target: ${recipient}`);
    } catch (error) {
        console.error('[EmailService] FAILED to queue email:', error);
    }
}

run();
