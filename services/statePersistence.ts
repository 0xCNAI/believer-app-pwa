import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ReversalStage, ReversalState } from './phaseEngine';

// ============ Types ============

export type NotificationEvent = 'ENTER_WATCH' | 'ENTER_PREPARE' | 'ENTER_CONFIRMED' | 'VETO_ON';

export interface StoredState {
    stage: ReversalStage;
    veto: boolean;
    finalScore: number;
}

export interface TrackingData {
    lastState: StoredState;
    lastNotifiedAt: Record<NotificationEvent, number>;
    lastStateHash: string;
    updatedAt: number;
}

export interface DiffResult {
    hasChanged: boolean;
    notifications: string[];
}

const COOLDOWNS: Record<NotificationEvent, number> = {
    'ENTER_WATCH': 7 * 24 * 60 * 60 * 1000,     // 7 days
    'ENTER_PREPARE': 3 * 24 * 60 * 60 * 1000,   // 3 days
    'ENTER_CONFIRMED': 1 * 24 * 60 * 60 * 1000, // 1 day
    'VETO_ON': 3 * 24 * 60 * 60 * 1000          // 3 days
};

// ============ Logic ============

const generateHash = (state: StoredState): string => {
    return `${state.stage}-${state.veto ? 'VETO' : 'CLEAN'}`;
};

export const syncStateAndCheckDiff = async (
    user: { id: string, email?: string },
    newState: ReversalState
): Promise<DiffResult> => {
    const DOC_PATH = `users/${user.id}/reversal_tracking/latest`;
    const docRef = doc(db, DOC_PATH);

    let trackingData: TrackingData = {
        lastState: {
            stage: 'Bottom Break',
            veto: false,
            finalScore: 0
        },
        lastNotifiedAt: {
            'ENTER_WATCH': 0,
            'ENTER_PREPARE': 0,
            'ENTER_CONFIRMED': 0,
            'VETO_ON': 0
        },
        lastStateHash: '',
        updatedAt: 0
    };

    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            trackingData = {
                ...trackingData,
                ...data,
                lastNotifiedAt: { ...trackingData.lastNotifiedAt, ...(data.lastNotifiedAt || {}) }
            };
        }
    } catch (e) {
        console.warn('[Persistence] Fetch failed:', e);
    }

    const { lastState } = trackingData;
    const notifications: string[] = [];
    const eventsToTrigger: NotificationEvent[] = [];
    let stateChanged = false; // Just for hash update

    // 1. Detect Events (Edge Logic)

    // A. Enter WATCH
    if (newState.stage === 'Watch' && lastState.stage !== 'Watch') {
        eventsToTrigger.push('ENTER_WATCH');
    }

    // B. Enter PREPARE
    if (newState.stage === 'Prepare' && lastState.stage !== 'Prepare') {
        eventsToTrigger.push('ENTER_PREPARE');
    }

    // C. Enter CONFIRMED
    if (newState.stage === 'Confirmed' && lastState.stage !== 'Confirmed') {
        eventsToTrigger.push('ENTER_CONFIRMED');
    }

    // D. Veto ON (Specifically when Stage is forced to Watch)
    if (newState.veto && !lastState.veto && newState.stage === 'Watch') {
        eventsToTrigger.push('VETO_ON');
    }

    // 2. Filter by Cooldown
    const now = Date.now();
    eventsToTrigger.forEach(event => {
        const lastTime = trackingData.lastNotifiedAt[event] || 0;
        const cooldown = COOLDOWNS[event];

        if (now - lastTime > cooldown) {
            // Passed Cooldown -> Add Notification
            notifications.push(getEventMessage(event, newState));
            trackingData.lastNotifiedAt[event] = now;
        } else {
            console.log(`[Persistence] Suppressed ${event} (Cooldown active)`);
        }
    });

    // 3. Check State Change for Storage Update
    const currentHash = generateHash({
        stage: newState.stage,
        veto: newState.veto,
        finalScore: newState.finalScore
    });

    if (currentHash !== trackingData.lastStateHash) {
        stateChanged = true;
    }

    // 4. Update Storage & Send Email
    if (stateChanged || notifications.length > 0) {
        const newStoredState: StoredState = {
            stage: newState.stage,
            veto: newState.veto,
            finalScore: newState.finalScore
        };

        const payload: TrackingData = {
            lastState: newStoredState,
            lastNotifiedAt: trackingData.lastNotifiedAt,
            lastStateHash: currentHash,
            updatedAt: now
        };

        try {
            await setDoc(docRef, payload);
            console.log('[Persistence] State updated:', currentHash);

            if (user.email && notifications.length > 0) {
                const subject = `[BetaAlpha] Reversal Alert: ${notifications[0]}`;
                const html = `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd;">
                        <h2 style="color: #333;">Market Status Update</h2>
                        <ul>${notifications.map(n => `<li>${n}</li>`).join('')}</ul>
                        <hr/>
                        <p>
                            Stage: <strong>${newState.stage}</strong> <br/>
                            Cycle Score: ${newState.cycleScore.toFixed(0)} / 70 <br/>
                            Trend Score: ${newState.trendScore.toFixed(0)} / 100 <br/>
                            Veto: ${newState.veto ? 'ACTIVE' : 'Inactive'}
                        </p>
                        <a href="https://betalpha-pick.web.app/" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Open App</a>
                    </div>
                `;

                await addDoc(collection(db, 'mail'), {
                    to: user.email,
                    message: { subject, html }
                });
                console.log('[Persistence] Email queued.');
            }
        } catch (e) {
            console.error('[Persistence] Save failed:', e);
        }
    }

    return { hasChanged: stateChanged, notifications };
};

// ============ Config Sync (New) ============

export interface UserConfig {
    // User Store
    predictionTopics?: string[];
    notificationSettings?: any;
    // Tech Store
    enabledConditions?: Record<string, boolean>;
    personalParams?: any;
    updatedAt: number;
}

export const saveUserConfig = async (userId: string, config: Partial<UserConfig>) => {
    if (!userId) return;
    try {
        const docRef = doc(db, `users/${userId}/config/settings`);
        // Merge with existing
        await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
        console.log('[Persistence] Config saved to cloud.');
    } catch (e) {
        console.warn('[Persistence] Save config failed:', e);
    }
};

export const loadUserConfig = async (userId: string): Promise<UserConfig | null> => {
    if (!userId) return null;
    try {
        const docRef = doc(db, `users/${userId}/config/settings`);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() as UserConfig : null;
    } catch (e) {
        console.warn('[Persistence] Load config failed:', e);
        return null;
    }
};

function getEventMessage(event: NotificationEvent, state: ReversalState): string {
    switch (event) {
        case 'ENTER_WATCH':
            return `Entered Watch Stage. Reason: ${state.watchReason || 'Score Threshold'}`;
        case 'ENTER_PREPARE':
            return 'Signal Strength Increased: PREPARE';
        case 'ENTER_CONFIRMED':
            return 'Signal Strength Max: CONFIRMED ✅';
        case 'VETO_ON':
            return 'Warning: Derivatives Overheated (Veto Active). Upside Capped.';
        default:
            return 'Market Status Update';
    }
}
