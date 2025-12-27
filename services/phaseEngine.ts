/**
 * Phase Engine V2.6 - Dual Track Reversal System
 *
 * Implements "Trend Score" (Technical) and "Cycle Score" (On-Chain/Derivatives)
 * with a "Derivatives Veto" safety mechanism.
 * 
 * V2.6 Updates:
 * - Zone: Explicitly mutually exclusive execution.
 * - CycleScore: Strict clamping on individual components.
 * - WatchReason: Priority defined as Zone Guarantee > Score Threshold.
 */


// ============ Types ============

export type ReversalStage = 'Bottom Break' | 'Watch' | 'Prepare' | 'Confirmed';
export type CycleZone = 'STRONG' | 'WEAK' | 'NONE';

export interface ReversalInputs {
    // Technical
    gateCount: number;
    higherLow: boolean;

    // On-Chain
    puell: number;
    mvrvZScore: number;

    // Derivatives
    funding24hWeighted: number; // %
    oi3dChangePct: number;      // %

    // Belief
    beliefPoints: number; // Raw points
}

export interface ReversalState {
    // Core Scores
    finalScore: number;
    trendScoreRaw: number;
    cycleScoreRaw: number;
    cycleBase: number;

    // Components
    techPoints: number;
    onChainPoints: number;
    derivPoints: number;

    // Status
    // Status
    stage: ReversalStage;
    watchReason?: 'ZONE_GUARANTEE' | 'SCORE_THRESHOLD';
    cycleZone: CycleZone;
    derivVeto: boolean;
    veto: boolean; // Alias for derivVeto
    phaseCap: number;

    // Aliases for UI/Persistence
    cycleScore: number; // Alias for cycleScoreRaw
    trendScore: number; // Alias for trendScoreRaw

    // Debug/UI Details
    vetoReason?: string;
    boostersApplied: string[];
    // AI / Copywriting Metadata
    cycleUser: number;
    driver: 'TREND' | 'CYCLE';
    zoneBonus: number;
    derivAdj: number;
}

// ============ Logic ============

// 1. Calculate Cycle Zone (On-Chain)
const calculateCycleZone = (puell: number, mvrv: number): CycleZone => {
    // MUTUALLY EXCLUSIVE ORDER:
    // 1. Check STRONG first.
    // 2. Else check WEAK.
    // 3. Default NONE.

    // STRONG: Deep Value (Puell < 0.6 OR MVRV < 0.8)
    if (puell < 0.6 || mvrv < 0.8) return 'STRONG';

    // WEAK: Moderate Value (Puell < 0.8 OR MVRV < 1.2)
    // Implicitly means NOT Strong because of previous return.
    if (puell < 0.8 || mvrv < 1.2) return 'WEAK';

    return 'NONE';
};

// 2. Derivatives Veto
const checkDerivVeto = (fundingPct: number, oi3dChangePct: number): { active: boolean, reason?: string } => {
    // Veto if: Funding > 0.015% AND OI 3D Change > 15%
    const fundingHigh = fundingPct > 0.015;
    const oiSurge = oi3dChangePct > 15;

    if (fundingHigh && oiSurge) {
        return { active: true, reason: 'High Funding + OI Surge' };
    }
    return { active: false };
};

// 3. Cycle Score Points (V2.3: 40 / 20 / 0)
const getOnChainPoints = (zone: CycleZone): number => {
    switch (zone) {
        case 'STRONG': return 40;
        case 'WEAK': return 20;
        case 'NONE': return 0;
    }
};

// 4. Derivatives Points (+10 / 0 / -10)
const getDerivPoints = (fundingPct: number, oi3dChangePct: number, veto: boolean): number => {
    if (veto) return -10; // Veto Penalty

    // Supportive: Low Funding (< 0.005%) + Low OI Change (< 5%)
    if (fundingPct < 0.005 && oi3dChangePct < 5) return 10;

    return 0; // Neutral
};

// ============ Main Calculator ============

export function calculateReversalState(
    inputs: ReversalInputs,
    activeBoosters: string[] = []
): ReversalState {
    const {
        gateCount, higherLow,
        puell, mvrvZScore,
        funding24hWeighted, oi3dChangePct,
        beliefPoints
    } = inputs;

    // --- A. Cycle Track (Leading) ---
    const cycleZone = calculateCycleZone(puell, mvrvZScore);
    const onChainPts = getOnChainPoints(cycleZone);
    const vetoResult = checkDerivVeto(funding24hWeighted, oi3dChangePct);
    const derivPts = getDerivPoints(funding24hWeighted, oi3dChangePct, vetoResult.active);

    // Cycle Base = Zone + Deriv (Includes Veto Penalty where applicable)
    const cycleBase = onChainPts + derivPts;

    // Cycle Base For Watch Trigger (Strictly Zone Bonus only)
    const cycleBaseForWatch = onChainPts;

    // Cycle User = Belief (Strictly clamped 0-25)
    // Ensures no negative inputs or excessive values.
    const cycleUser = Math.min(25, Math.max(0, beliefPoints));

    // Cycle Score = Clamp(Base + User, 0, 70)
    let cycleScoreRaw = Math.min(70, Math.max(0, cycleBase + cycleUser));

    // --- B. Trend Track (Technical) ---
    // V2.2: Gate Count * 25. (0, 25, 50, 75, 100)
    const trendScoreRaw = Math.min(gateCount, 4) * 25;

    // --- C. Phase Cap ---
    // Guardrails based on Structure
    let phaseCap = 60; // Accumulation
    if (gateCount >= 3 && higherLow) phaseCap = 100; // Expansion
    else if (gateCount >= 2) phaseCap = 75; // Transition

    // --- D. Final Score ---
    // Max of tracks, but capped by Phase
    let finalScore = Math.max(trendScoreRaw, cycleScoreRaw);
    finalScore = Math.min(phaseCap, finalScore);

    // Determine Driver
    const driver = trendScoreRaw >= cycleScoreRaw ? 'TREND' : 'CYCLE';

    // --- E. Stage Determination ---
    let stage: ReversalStage = 'Bottom Break';
    let watchReason: 'ZONE_GUARANTEE' | 'SCORE_THRESHOLD' | undefined;

    // 1. Initial Assessment (Business Rules)

    // Confirmed: Score >= 75 AND Structure AND No Veto
    if (finalScore >= 75 && gateCount >= 3 && higherLow && !vetoResult.active) {
        stage = 'Confirmed';
    }
    // Prepare: Score >= 60 AND No Veto
    else if (finalScore >= 60 && !vetoResult.active) {
        stage = 'Prepare';
    }
    // Watch Analysis
    else {
        // Check Watch Conditions
        const scoreQualifies = finalScore >= 45;
        const zoneQualifies = cycleBaseForWatch >= 35; // Triggered by STRONG (40)

        if (scoreQualifies || zoneQualifies) {
            stage = 'Watch';

            // Determine Reason (Priority: Zone Guarantee > Score)
            if (zoneQualifies) watchReason = 'ZONE_GUARANTEE';
            else watchReason = 'SCORE_THRESHOLD';
        } else {
            stage = 'Bottom Break';
        }
    }

    // 2. Veto Override (Safety Net / Final Authority)
    // Strict requirement: Confirmed/Prepare stages MUST NOT have active Veto.
    if (vetoResult.active) {
        if (stage === 'Confirmed' || stage === 'Prepare') {
            stage = 'Watch'; // Downgrade
            // If it was Score-driven, keep SCORE_THRESHOLD.
            // If it was Zone-driven (unlikely for Confirmed, but possible for Prepare), logic holds.
            // Usually high score drives these stages, so we default reason to SCORE if undefined.
            if (!watchReason) watchReason = 'SCORE_THRESHOLD';
        }
    }

    return {
        finalScore,
        trendScoreRaw,
        cycleScoreRaw,
        cycleBase,
        techPoints: trendScoreRaw,
        onChainPoints: onChainPts,
        derivPoints: derivPts,
        stage,
        watchReason,
        cycleZone,
        derivVeto: vetoResult.active,
        veto: vetoResult.active, // Alias
        cycleScore: cycleScoreRaw, // Alias
        trendScore: trendScoreRaw, // Alias
        vetoReason: vetoResult.reason,
        phaseCap,
        boostersApplied: activeBoosters,
        // AI / Copywriting fields
        cycleUser,
        driver,
        zoneBonus: onChainPts,
        derivAdj: derivPts
    };
}
