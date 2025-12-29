
import { db } from './firebase';
import {
    collection,
    doc,
    runTransaction,
    getDoc,
    setDoc,
    query,
    orderBy,
    limit,
    getDocs,
    increment,
    updateDoc
} from 'firebase/firestore';

export interface MeritUser {
    id: string;
    displayName: string;
    merit: number;
}

export const MERIT_STATS_DOC = 'stats/merit';

export const syncUserMerit = async (userId: string, displayName: string, totalLocalMerit: number) => {
    if (totalLocalMerit <= 0) return;

    const userRef = doc(db, 'users', userId);
    const statsRef = doc(db, MERIT_STATS_DOC);

    try {
        await runTransaction(db, async (transaction) => {
            console.log(`[MeritService] Transaction Start for User: ${userId}`);
            // 1. Get Current Persistence State
            const userDoc = await transaction.get(userRef);
            let previousMerit = 0;

            if (userDoc.exists()) {
                previousMerit = userDoc.data().merit || 0;
            }

            // 2. Calculate Difference
            const diff = totalLocalMerit - previousMerit;

            if (diff === 0) return; // No change

            // 3. Update User Doc
            if (!userDoc.exists()) {
                transaction.set(userRef, {
                    merit: totalLocalMerit,
                    displayName: displayName,
                    updatedAt: Date.now()
                }, { merge: true });
            } else {
                transaction.update(userRef, {
                    merit: totalLocalMerit,
                    displayName: displayName,
                    updatedAt: Date.now()
                });
            }

            // 4. Update Global Stats
            // Only update global if diff is positive (to prevent decrementing on device switch/reset)
            // Or allow decrement? Better to only allow increment for now to be safe against data loss.
            // Actually, if I reset my profile, I might start from 0. Global shouldn't decrease?
            // "Merit" implies accumulation. Let's support adding the DIFF.
            // If diff is positive, we add to global.
            if (diff > 0) {
                const statsDoc = await transaction.get(statsRef);
                if (!statsDoc.exists()) {
                    transaction.set(statsRef, { total: diff });
                } else {
                    transaction.update(statsRef, { total: increment(diff) });
                }
            }
        });
        console.log(`[MeritService] Merit sync complete for user ${userId}`);
    } catch (e) {
        console.error("[MeritService] Merit Sync Failed:", e);
    }
};

export const getGlobalMerit = async (): Promise<number> => {
    try {
        console.log('[MeritService] Fetching Global Stats...');
        const snap = await getDoc(doc(db, MERIT_STATS_DOC));
        const val = snap.exists() ? snap.data().total : 0;
        console.log('[MeritService] Global Stats:', val);
        return val;
    } catch (e) {
        console.error('[MeritService] Global Fetch Error:', e);
        return 0;
    }
};

export const getLeaderboard = async (limitCount = 100): Promise<MeritUser[]> => {
    try {
        console.log('[MeritService] Fetching Leaderboard...');
        const q = query(
            collection(db, 'users'),
            orderBy('merit', 'desc'),
            limit(100) // Increase limit to 100 for "All Users" feel
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({
            id: d.id,
            displayName: d.data().displayName || 'Anonymous',
            merit: d.data().merit || 0
        }));
    } catch (e) {
        console.error("Leaderboard Fetch Error:", e);
        return [];
    }
};
