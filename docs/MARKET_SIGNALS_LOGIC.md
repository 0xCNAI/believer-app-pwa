# Believer Market Signals Logic (V4.2)

這份文件詳細說明了 Believer 系統如何抓取、過濾與計算市場動態指標。我們的目標是確保數據精確，並解決 "0% / 100%" 的顯示問題。

## 1. 核心邏輯 (Core Philosophy)

*   **資料來源**: Polymarket (Gamma API)。
*   **搜尋策略**: 優先使用 `tag_slug` (標籤) 鎖定特定主題，確保不會抓到不相關的市場。
*   **過濾機制**: 
    *   **年份鎖定**: 對於宏觀長期風險（如衰退），強制鎖定 `2026` 或 `2027`，避免抓到即將過期的 2024/2025 市場。
    *   **流動性過濾**: 透過 API 排序 (Sort by Volume) 取交易量最大的市場，確保數據具代表性。
    *   **格式正規化**: 統一處理 API 回傳的 `snake_case` 與 `camelCase`，避免 JavaScript 讀不到數值導致的 0/100% 錯誤。

## 2. 指標定義與計算方式 (Signal Definitions)

我們目前追蹤以下 5 個關鍵指標，每個指標的抓取邏輯如下：

### A. Fed 利率決策 (Fed Interest Rates)
*   **ID**: `fed_decision_series`
*   **搜尋標籤**: `fed`, `interest-rates`
*   **選取邏輯**: 取交易量最高的單一市場（通常是最近期的 FOMC 會議）。
*   **機率計算**: 
    *   這是一個 **多選項 (Multi-outcome)** 市場。
    *   我們不使用單一的 Yes/No。
    *   **降息 (Cut)**: 加總包含 "Cut", "Decrease" 關鍵字的選項機率。
    *   **維持 (Hold)**: 加總 "Maintain", "Unchanged" 的機率。
    *   **升息 (Hike)**: 加總 "Increase", "Hike" 的機率。
*   **顯示方式**: 優先顯示 "Cut X%" (若降息是主軸)，點擊後可看到完整分佈。

### B. 美國經濟衰退 (US Recession)
*   **ID**: `us_recession_end_2026`
*   **搜尋標籤**: `recession`
*   **強制關鍵字**: `2026` (鎖定長線風險)
*   **排除關鍵字**: `canada`, `uk`, `europe`, `germany` (排除其他國家)
*   **機率計算**: 
    *   這是一個 **二元 (Binary)** 市場 (Yes/No)。
    *   **正向分數 (Positive Score)**: `1 - P(Yes)`。
    *   例如：若市場認為 2026 衰退機率為 28% (P_Yes = 0.28)，則系統顯示「無衰退機率」為 72%。
*   **修正重點**: 確保前端能正確解析 `outcome_prices` 陣列，避免 fallback 到 0。

### C. 美國政府停擺 (Gov Shutdown)
*   **ID**: `gov_funding_lapse_jan31_2026`
*   **搜尋標籤**: `shutdown`, `government`
*   **機率計算**: `1 - P(Yes)` (政府正常運作機率)。

### D. 美債違約 (US Debt Default)
*   **ID**: `us_default_by_2027`
*   **搜尋標籤**: `default`, `debt`
*   **機率計算**: `1 - P(Yes)` (無違約機率)。

### E. 比特幣戰略儲備 (BTC Strategic Reserve)
*   **ID**: `us_btc_reserve_before_2027`
*   **搜尋標籤**: `bitcoin`, `reserve`
*   **機率計算**: `P(Yes)` (直接使用 Yes 機率)。
*   **備註**: 這是唯一的「正向事件」，機率越高越好。

---

## 3. 0% / 100% Bug 的根源與解法

### 問題 (Root Cause)
Polymarket API 回傳的 JSON 欄位是 `outcome_prices` (底線)，但我們的前端代碼在某些地方預期 `outcomePrices` (駝峰)。
當代碼讀取 `market.outcomePrices` 時得到 `undefined`，經過 `parseFloat` 或 fallback 邏輯後變成了 `0` 或 `1` (如果是 Yes/No)。

### 解法 (Solution)
在 `services/realApi.ts` 中實作一個 **正規化層 (Normalization Layer)**：
```typescript
const _normalizeMarketEvent = (raw: any) => ({
    // ...
    outcomePrices: raw.outcome_prices || raw.outcomePrices, // 雙重檢查
    outcomes: raw.outcomes, // 確保是陣列
    // ...
});
```
這已在最新的 commit 中實作，預期能解決所有二元市場的顯示問題。

### Fed 系列市場的特殊問題
使用者回報 Fed 市場顯示 "Yes/No 0%/100%"。這表示系統抓到了一個 Fed 市場，但誤判它為二元市場，或者抓到了錯誤的 Fed 相關市場。
**修正計劃**: 
1. 檢查 `fed_decision_series` 抓到的具體市場 ID。
2. 確保 `marketData.ts` 中的 `fetchUnifiedMarkets` 針對 Fed 市場正確保留了 `outcomes` 陣列，而不是被後續的聚合邏輯壓成 Yes/No。

---

## 4. 下一步行動 (Next Steps)

1.  **確認正規化**: 確保所有 API 回傳都經過 `_normalizeMarketEvent`。
2.  **Fed 邏輯優化**: 專門檢查 Fed 系列的處理邏輯，確保它保留多選項數據。
3.  **UI 驗證**: 確保 Dashboard 能顯示 "Cut 25% · Hold 75%" 這種細膩的數據，而不是單一數字。
