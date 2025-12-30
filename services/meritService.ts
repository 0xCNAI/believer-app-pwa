
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

/**
 * Syncs local merit to the server.
 * Updates both the user's specific document and the global stats counter.
 * Using a transaction ensures consistency.
 */
export const syncUserMerit = async (userId: string, displayName: string, totalLocalMerit: number) => {
    if (totalLocalMerit <= 0) return;

    // Use a subcollection or root collection for users? 
    // Plan calls for `users/{userId}` to store merit directly.
    const userRef = doc(db, 'users', userId);
    const statsRef = doc(db, MERIT_STATS_DOC);

    try {
        await runTransaction(db, async (transaction) => {
            console.log(`[MeritService] Transaction Start for User: ${userId}`);

            // 1. Get Current User State
            const userDoc = await transaction.get(userRef);
            let previousMerit = 0;

            if (userDoc.exists()) {
                previousMerit = userDoc.data().merit || 0;
            }

            // 2. Calculate Difference (New - Old)
            // We only care if the new local total is higher (accumulation)
            const diff = totalLocalMerit - previousMerit;

            if (diff <= 0) {
                // No new merit (or potentially a reset device). 
                // We do NOT decrement global merit even if local is lower (user might have multiple devices).
                // But we DO update the user doc to the highest seen value? 
                // Or if local is lower, maybe we should fetch remote first? 
                // For this simple implementation: Source of Truth is strictly "Highest Value Wins" or "Local overwrites if higher".
                return;
            }

            // 3. Update User Doc
            if (!userDoc.exists()) {
                transaction.set(userRef, {
                    merit: totalLocalMerit,
                    displayName: displayName, // Store name for leaderboard
                    updatedAt: Date.now()
                }, { merge: true });
            } else {
                transaction.update(userRef, {
                    merit: totalLocalMerit,
                    // Only update name if provided and valid, otherwise keep existing
                    ...(displayName ? { displayName } : {}),
                    updatedAt: Date.now()
                });
            }

            // 4. Update Global Stats
            // We add the *difference* to the global total
            const statsDoc = await transaction.get(statsRef);
            if (!statsDoc.exists()) {
                transaction.set(statsRef, { total: diff });
            } else {
                transaction.update(statsRef, { total: increment(diff) });
            }
        });
        console.log(`[MeritService] Merit sync successful. Added ${totalLocalMerit} (total)`);
    } catch (e) {
        console.error("[MeritService] Merit Sync Failed:", e);
    }
};

export const getGlobalMerit = async (): Promise<number> => {
    try {
        const snap = await getDoc(doc(db, MERIT_STATS_DOC));
        return snap.exists() ? snap.data().total : 0;
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
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, // Display ID as requested
                displayName: data.displayName || `User ${d.id.slice(0, 4)}`, // Fallback
                merit: data.merit || 0
            };
        });
    } catch (e) {
        console.error("Leaderboard Fetch Error:", e);
        return [];
    }
};
