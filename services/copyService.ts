/**
 * Copy Service - Reversal Index Copywriting System
 * 
 * Translates technical Reversal State into "1-second understandable" human language.
 * Uses a rigorous fallback system (V1) while supporting AI enhancements (V2).
 */

import { ReversalState } from './phaseEngine';

// ============ Types ============

// Display Stage: Decoupled from calculation stage to handle UI-specific states like "Overheated"
export type DisplayStage = 'BOTTOM_BREAK' | 'WATCH' | 'PREPARE' | 'CONFIRMED' | 'OVERHEATED';

export interface StageCopy {
    title: string;           // DisplayStage-based title (e.g., "過熱 Overheated")
    oneLiner: string;        // Fixed one-liner conclusion
    reasonLines: string[];   // Unified reason text (1-3 lines)
    next: string[];          // Next steps (1-2 lines)
    tags?: string[];         // Optional badges
    displayStage: DisplayStage; // For UI styling/icons
}

export interface StageAIFill {
    reasonHeadline?: string;
    reasonBullets?: string[];
    nextBullets?: string[];
    tags?: string[];
    evidenceKeys?: string[];  // e.g. ["EARLY_SIGNAL", "TREND_WEAK"]
    compliance?: { ok: boolean; notes: string };
}

// ============ Configuration & Templates ============

const TEMPLATES: Record<string, {
    title: string;
    oneLiner: string;
    defaultReason: string[];
    defaultNext: string[];
    tags?: string[];
}> = {
    BOTTOM_BREAK: {
        title: '底部破壞 Bottom Break',
        oneLiner: '目前仍偏弱，還不到佈局時機。',
        defaultReason: ['價格結構尚未轉強', '早期訊號也不足以支撐進入觀察名單'], // Formatted as bullet points
        defaultNext: ['先觀察風險是否下降', '等待進入 Watch 再開始規劃']
    },
    WATCH_ZONE: {
        title: '觀察 Watch',
        oneLiner: '還不是反轉，但已出現『接近底部』的早期訊號。',
        defaultReason: ['鏈上估值進入明顯偏便宜的區間，所以先加入觀察名單'],
        defaultNext: ['可以先規劃小額分批策略', '等待升級到 Prepare 才開始行動'],
        tags: ['估值偏便宜', '左側預警']
    },
    WATCH_SCORE: {
        title: '觀察 Watch',
        oneLiner: '還不是反轉，但已出現『接近底部』的早期訊號。',
        defaultReason: ['早期訊號已達觀察門檻，但技術面仍偏弱，需要再等待確認'],
        defaultNext: ['可以先規劃小額分批策略', '重點看價格是否開始轉強'],
        tags: ['早期訊號轉強', '趨勢未成形']
    },
    PREPARE: {
        title: '準備 Prepare',
        oneLiner: '可以開始小額分批，但仍屬早期階段。',
        defaultReason: ['早期訊號已足夠強，且目前沒有出現過熱熔斷'],
        defaultNext: ['用分批方式、小額開始', '若出現過熱（Overheated）則暫停加碼']
    },
    CONFIRMED: {
        title: '確認 Confirmed',
        oneLiner: '趨勢已被確認，反轉機率明顯提高。',
        defaultReason: ['價格結構已轉強（包含更高低點）', '且未出現過熱熔斷，因此進入確認區'],
        defaultNext: ['可從小額分批轉為更有計畫的配置', '仍需留意過熱或結構破壞']
    },
    OVERHEATED: {
        title: '過熱 Overheated',
        oneLiner: '市場訊號不差，但槓桿過熱，現在不適合追進。',
        defaultReason: ['期貨/槓桿過熱已觸發煞車，系統會暫停任何『可進場』信號'],
        defaultNext: ['先觀察過熱是否降溫', '降溫後再看是否回到 Prepare'],
        tags: ['槓桿偏熱', '暫停進場']
    }
};

// ============ Resolver Logic ============

export function resolveReversalCopy(state: ReversalState | null, aiFill?: StageAIFill): StageCopy {
    // 0. Null State Handling
    if (!state) {
        return {
            title: '系統初始化中...',
            oneLiner: '正在讀取市場數據...',
            reasonLines: [],
            next: [],
            displayStage: 'BOTTOM_BREAK'
        };
    }

    // 1. Determine Display Stage
    // If veto is active, override everything to OVERHEATED
    const displayStage: DisplayStage = state.veto ? 'OVERHEATED' :
        state.stage === 'Bottom Break' ? 'BOTTOM_BREAK' :
            state.stage === 'Watch' ? 'WATCH' :
                state.stage === 'Prepare' ? 'PREPARE' :
                    state.stage === 'Confirmed' ? 'CONFIRMED' : 'BOTTOM_BREAK';

    // 2. Resolve Watch Reason (Strict Fallback)
    // If watchReason is missing but we depend on it, assume based on data
    let safeWatchReason = state.watchReason;
    if (!safeWatchReason && displayStage === 'WATCH') {
        if (state.zoneBonus === 40) safeWatchReason = 'ZONE_GUARANTEE';
        else if (state.finalScore >= 45) safeWatchReason = 'SCORE_THRESHOLD';
    }

    // 3. Select Template
    let template;

    if (displayStage === 'OVERHEATED') {
        template = TEMPLATES.OVERHEATED;
    } else if (displayStage === 'BOTTOM_BREAK') {
        template = TEMPLATES.BOTTOM_BREAK;
    } else if (displayStage === 'PREPARE') {
        template = TEMPLATES.PREPARE;
    } else if (displayStage === 'CONFIRMED') {
        template = TEMPLATES.CONFIRMED;
    } else {
        // WATCH
        if (safeWatchReason === 'ZONE_GUARANTEE') {
            template = TEMPLATES.WATCH_ZONE;
        } else {
            template = TEMPLATES.WATCH_SCORE;
        }
    }

    // 4. Construct Output (Merge with AI if available)

    // Reason Construction
    let reasonLines: string[] = [];
    if (aiFill?.reasonHeadline) {
        reasonLines.push(aiFill.reasonHeadline);
        if (aiFill.reasonBullets && aiFill.reasonBullets.length > 0) {
            reasonLines.push(...aiFill.reasonBullets);
        }
    } else {
        reasonLines = template.defaultReason;
    }

    // Next Steps Construction
    let nextLines: string[] = [];
    if (aiFill?.nextBullets && aiFill.nextBullets.length > 0) {
        nextLines.push(...aiFill.nextBullets);
    } else {
        nextLines = template.defaultNext;
    }

    // Tags Construction (User defined tags + AI tags if any)
    let tags = template.tags || [];
    if (aiFill?.tags) {
        tags = aiFill.tags; // AI tags override or append? User request implies replacement or AI fill. 
        // Let's assume AI tags replace default tags if provided, as they are context specific.
    }

    return {
        title: template.title,
        oneLiner: template.oneLiner,
        reasonLines,
        next: nextLines,
        tags,
        displayStage
    };
}
