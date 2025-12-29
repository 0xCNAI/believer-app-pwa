
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

export const incrementUserMerit = async (userId: string, displayName: string, amount: number) => {
    if (amount <= 0) return;

    const userRef = doc(db, 'users', userId);
    const statsRef = doc(db, MERIT_STATS_DOC);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Update User
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                transaction.set(userRef, {
                    merit: amount,
                    displayName: displayName,
                    updatedAt: Date.now()
                }, { merge: true });
            } else {
                transaction.update(userRef, {
                    merit: increment(amount),
                    displayName: displayName, // Update name if changed
                    updatedAt: Date.now()
                });
            }

            // 2. Update Global Stats
            const statsDoc = await transaction.get(statsRef);
            if (!statsDoc.exists()) {
                transaction.set(statsRef, { total: amount });
            } else {
                transaction.update(statsRef, { total: increment(amount) });
            }
        });
    } catch (e) {
        console.error("Merit Increment Failed:", e);
    }
};

export const getGlobalMerit = async (): Promise<number> => {
    try {
        const snap = await getDoc(doc(db, MERIT_STATS_DOC));
        return snap.exists() ? snap.data().total : 0;
    } catch (e) {
        return 0;
    }
};

export const getLeaderboard = async (limitCount = 10): Promise<MeritUser[]> => {
    try {
        const q = query(
            collection(db, 'users'),
            orderBy('merit', 'desc'),
            limit(limitCount)
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
