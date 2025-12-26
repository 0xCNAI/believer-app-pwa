/**
 * Phase Engine
 * 
 * Determines market phase based on Engine Gates
 * and calculates cap adjustments from Boosters and Risk Modifiers.
 */

import { ConditionResult } from './techEngine';
import { fetchFundingRate, getLiquidityStatus } from './priceService';

// ============ Types ============

export type Phase = 'Accumulation' | 'Transition' | 'Expansion';
export type LiquidityStatus = 'improving' | 'neutral' | 'tight';

export interface RiskModifiers {
    fundingRate: number;
    liquidityStatus: LiquidityStatus;
    mvrvZScore: number; // Mock for now
}

export interface PhaseResult {
    phase: Phase;
    baseCap: number;
    adjustedCap: number;
    techScore: number;
    confidence: number;
    liquidityMultiplier: number;
    gatesPassedCount: number;
    boostersApplied: string[];
    riskAdjustments: string[];
    warning?: string;
}

// ============ Risk Modifiers Fetcher ============

export async function fetchRiskModifiers(): Promise<RiskModifiers> {
    const [fundingRate, liquidityStatus] = await Promise.all([
        fetchFundingRate(),
        getLiquidityStatus(),
    ]);

    return {
        fundingRate,
        liquidityStatus,
        mvrvZScore: 0.5, // Mock - would need Glassnode or similar
    };
}

// ============ Phase Calculation ============

export function calculatePhase(
    conditions: ConditionResult[],
    riskModifiers?: RiskModifiers
): PhaseResult {
    const gates = conditions.filter(c => c.group === 'Gate');
    const boosters = conditions.filter(c => c.group === 'Booster');

    // Check if all gates are disabled
    const enabledGates = gates.filter(g => g.enabled);
    if (enabledGates.length === 0) {
        return {
            phase: 'Accumulation',
            baseCap: 60,
            adjustedCap: 60,
            techScore: 30,
            confidence: 0,
            liquidityMultiplier: 1.0,
            gatesPassedCount: 0,
            boostersApplied: [],
            riskAdjustments: [],
            warning: '⚠️ All Engine Gates disabled. Showing preference index only.',
        };
    }

    // Count passed gates
    const passedGates = enabledGates.filter(g => g.passed);
    const gatesPassedCount = passedGates.length;
    const higherLowPassed = gates.find(g => g.id === 'higher_low')?.passed || false;

    // Determine phase
    let phase: Phase;
    let baseCap: number;

    if (gatesPassedCount >= 3 && higherLowPassed) {
        phase = 'Expansion';
        baseCap = 100;
    } else if (gatesPassedCount >= 2) {
        phase = 'Transition';
        baseCap = 75;
    } else {
        phase = 'Accumulation';
        baseCap = 60;
    }

    // Apply Booster adjustments
    let adjustedCap = baseCap;
    const boostersApplied: string[] = [];
    const riskAdjustments: string[] = [];

    const enabledBoosters = boosters.filter(b => b.enabled);

    for (const booster of enabledBoosters) {
        if (!booster.passed) continue;

        switch (booster.id) {
            case 'momentum_divergence':
                adjustedCap = Math.min(100, adjustedCap + 10);
                boostersApplied.push('Divergence +10');
                break;
            case 'volume_confirmation':
                boostersApplied.push('Volume ✓');
                break;
            case 'range_breakout':
                adjustedCap = Math.min(100, adjustedCap + 5);
                boostersApplied.push('Breakout +5');
                break;
            case 'vol_expansion':
                const isDown = booster.detail?.includes('down');
                if (isDown) {
                    adjustedCap = Math.max(40, adjustedCap - 10);
                    boostersApplied.push('Vol Exp ↓ -10');
                }
                break;
        }
    }

    // ============ Risk Modifiers ============

    // 1. Liquidity Multiplier
    let liquidityMultiplier = 1.0;
    if (riskModifiers) {
        if (riskModifiers.liquidityStatus === 'improving') {
            liquidityMultiplier = 1.2;
            riskAdjustments.push('Liquidity ↑ ×1.2');
        } else if (riskModifiers.liquidityStatus === 'tight') {
            liquidityMultiplier = 0.8;
            riskAdjustments.push('Liquidity ↓ ×0.8');
        }

        // 2. Funding Rate Penalty
        if (Math.abs(riskModifiers.fundingRate) > 0.02) {
            if (riskModifiers.fundingRate > 0) {
                adjustedCap = Math.max(40, adjustedCap - 10);
                riskAdjustments.push('High Funding -10');
            } else {
                // Negative funding in Accumulation is bullish
                if (phase === 'Accumulation') {
                    riskAdjustments.push('Neg Funding (bullish)');
                }
            }
        }

        // 3. MVRV Z-Score Cap Adjustment
        if (riskModifiers.mvrvZScore < -1) {
            adjustedCap = Math.min(100, adjustedCap + 10);
            riskAdjustments.push('MVRV undervalued +10');
        } else if (riskModifiers.mvrvZScore > 2) {
            adjustedCap = Math.min(adjustedCap, 70);
            riskAdjustments.push('MVRV overvalued cap→70');
        }
    }

    // Calculate Tech Score
    const avgGateScore = enabledGates.length > 0
        ? enabledGates.reduce((sum, g) => sum + g.score, 0) / enabledGates.length
        : 0;

    // Apply liquidity multiplier to tech score
    const techScore = avgGateScore * baseCap * liquidityMultiplier;

    // Confidence
    const avgConfidence = enabledGates.length > 0
        ? enabledGates.reduce((sum, g) => sum + g.confidence, 0) / enabledGates.length
        : 0;

    return {
        phase,
        baseCap,
        adjustedCap,
        techScore: Math.min(techScore, adjustedCap),
        confidence: avgConfidence,
        liquidityMultiplier,
        gatesPassedCount,
        boostersApplied,
        riskAdjustments,
    };
}
