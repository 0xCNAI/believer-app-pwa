export interface TechCondition {
    id: string;
    group: 'Trend Position' | 'Trend Structure' | 'Momentum' | 'Volatility' | 'Key Levels' | 'Confirmation';
    title: string;
    description: string;
    explanation: string; // Observation Logic (Reason & Principle)
    defaultParams: Record<string, any>;
}

export const TECH_CONDITIONS: TechCondition[] = [
    // --- I. Trend Position ---
    {
        id: 'trend_ma_dist',
        group: 'Trend Position',
        title: 'Price vs Long-Term MA',
        description: '價格接近或遠離長期均線 (200D/200W)',
        explanation: '觀察理由：均線是市場成本的共識。長期均線往往是大型機構的心理防線。\n\n原理：當價格偏離均線過遠時會有均值回歸壓力；當價格多次測試均線而不破，則構成強支撐/壓力。',
        defaultParams: {
            maPeriod: '200D',
            thresholdPct: 5, // +/- 5%
            mode: 'Approaching' // or Touching, Reclaiming
        }
    },
    {
        id: 'trend_slope',
        group: 'Trend Position',
        title: 'Trend Direction (Slope)',
        description: '長期趨勢是否停止惡化 (斜率翻平)',
        explanation: '觀察理由：趨勢改變往往先於價格反轉。斜率變平代表原有的動能正在衰竭。\n\n原理：下跌趨勢中，均線斜率由負轉平，意味著賣壓已逐漸被時間消化，是打底的必要條件。',
        defaultParams: {
            period: '60d',
            sensitivity: 'Neutral'
        }
    },

    // --- II. Trend Structure ---
    {
        id: 'struct_convergence',
        group: 'Trend Structure',
        title: 'Multi-Timeframe Convergence',
        description: '多週期趨勢收斂 (日線/週線背離)',
        explanation: '觀察理由：單一週期的信號容易有雜訊，多週期共振代表市場共識的一致性。\n\n原理：當日線反彈但週線受壓，往往是假突破；當兩者方向一致收斂，趨勢的可信度大幅提升。',
        defaultParams: {
            frames: ['Daily', 'Weekly'],
            type: 'Bullish Divergence'
        }
    },
    {
        id: 'struct_lows',
        group: 'Trend Structure',
        title: 'Structural Lows',
        description: '是否出現 Higher Low (不再破底)',
        explanation: '觀察理由：不再創新低是多頭力量開始介入的最直觀證據。\n\n原理：道氏理論基礎，Higher Low 代表買盤在更高的價格願意承接，賣壓已無法將價格壓回原低點。',
        defaultParams: {
            lookback: '90d',
            confirmClose: true
        }
    },

    // --- III. Momentum ---
    {
        id: 'mom_exhaustion',
        group: 'Momentum',
        title: 'Momentum Exhaustion',
        description: '下跌動能減弱 (RSI/MACD 鈍化)',
        explanation: '觀察理由：極致的悲觀往往發生在底部，但指標會先鈍化。\n\n原理：當價格持續下跌但指標不再創新低 (背離)，代表單位價格下跌所需的賣盤量能正在減少。',
        defaultParams: {
            threshold: 'Oversold',
            confirmations: 2
        }
    },
    {
        id: 'mom_divergence',
        group: 'Momentum',
        title: 'Price/Momentum Divergence',
        description: '價格創低但動能背離',
        explanation: '觀察理由：量價背離是趨勢反轉最強烈的早期信號之一。\n\n原理：價格新低由少數恐慌盤造成，但整體動能指標未破底，顯示主力資金已停止殺跌或開始吸籌。',
        defaultParams: {
            timeframe: 'Daily'
        }
    },

    // --- IV. Volatility ---
    {
        id: 'vol_compression',
        group: 'Volatility',
        title: 'Volatility Compression',
        description: '長期波動率壓縮 (蓄能)',
        explanation: '觀察理由：低波動率往往是大行情的前兆。\n\n原理：市場像彈簧，壓縮越久，釋放能量越強。長時間的窄幅震盪代表多空雙方籌碼交換已接近尾聲。',
        defaultParams: {
            percentile: 20, // Low percentile
            duration: '30d'
        }
    },
    {
        id: 'vol_expansion',
        group: 'Volatility',
        title: 'Volatility Expansion',
        description: '波動率突然擴張 (變盤)',
        explanation: '觀察理由：變盤點往往伴隨著波動率的突然放大。\n\n原理：平靜後的第一次大幅波動，通常代表新趨勢（或區間突破）的啟動信號。',
        defaultParams: {
            direction: 'Any'
        }
    },

    // --- V. Key Levels ---
    {
        id: 'level_range',
        group: 'Key Levels',
        title: 'Range Breakout',
        description: '脫離長期橫盤區間',
        explanation: '觀察理由：橫盤後的突破確認了新方向的選擇。\n\n原理：長期箱體整理累積了大量籌碼，一旦突破箱體邊界，解套盤與追價盤會形成新的趨勢推力。',
        defaultParams: {
            rangeLookback: 'Recent High/Low'
        }
    },
    {
        id: 'level_historical',
        group: 'Key Levels',
        title: 'Historical Support',
        description: '接近歷史關鍵支撐區',
        explanation: '觀察理由：歷史高成交量區間具有強大的心理與籌碼記憶。\n\n原理：過去的大量換手區，是市場公認的"合理價格"，價格回調至此容易引發價值投資買盤。',
        defaultParams: {
            years: 2,
            proximity: 3 // %
        }
    },

    // --- VI. Confirmation ---
    {
        id: 'conf_volume',
        group: 'Confirmation',
        title: 'Volume Confirmation',
        description: '價格變動搭配成交量確認',
        explanation: '觀察理由：沒有成交量支持的價格變動通常是不可持續的。\n\n原理：上漲放量代表買盤積極；下跌縮量代表賣壓枯竭。量價配合是驗證趨勢真實性的關鍵。',
        defaultParams: {
            multiplier: 1.5
        }
    }
];
