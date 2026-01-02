
/**
 * Email Template Generator
 * Handles HTML generation for system notifications
 */

// Helper for common styles
const styles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;',
    header: 'background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;',
    content: 'padding: 24px; border: 1px solid #eee; border-top: none; background-color: #fafafa;',
    footer: 'text-align: center; margin-top: 20px; font-size: 12px; color: #888;',
    button: 'display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; margin-top: 16px; font-weight: bold;',
    highlight: 'color: #2563eb; font-weight: bold;',
    alertNegative: 'color: #dc2626; font-weight: bold;',
    alertPositive: 'color: #16a34a; font-weight: bold;',
    card: 'background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 12px;'
};

// 1. Volatility Alert
export function generateVolatilityAlert(signalName: string, changePercent: number, currentProb: number, previousProb: number) {
    const isPositive = changePercent > 0;
    const colorStyle = isPositive ? styles.alertPositive : styles.alertNegative;
    const arrow = isPositive ? '↑' : '↓';

    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">⚠️ 市場警示: ${signalName}</h2>
        </div>
        <div style="${styles.content}">
            <p>在過去 24 小時內，我們偵測到顯著的市場波動。</p>
            
            <div style="${styles.card}">
                <h3 style="margin-top:0;">${signalName}</h3>
                <p style="font-size: 24px; margin: 8px 0;">
                    <span style="${colorStyle}">${arrow} ${Math.abs(changePercent).toFixed(1)}%</span>
                </p>
                <p style="margin: 0; color: #666;">
                    機率從 <strong>${(previousProb * 100).toFixed(0)}%</strong> 變動至 <strong>${(currentProb * 100).toFixed(0)}%</strong>。
                </p>
            </div>

            <p>市場情緒正在快速轉變，請查看 App 以獲取詳細分析。</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">查看市場分析</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. 版權所有。</p>
        </div>
    </div>`;
}

// 2. Phase Change Alert
export function generatePhaseChangeAlert(oldPhase: string, newPhase: string, score: number) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">🔄 系統階段更新</h2>
        </div>
        <div style="${styles.content}">
            <p><strong>Believer 反轉指數</strong> 已進入新的階段。</p>
            
            <div style="${styles.card}; text-align: center;">
                <p style="color: #666; font-size: 14px; margin-bottom: 4px;">當前階段</p>
                <h2 style="font-size: 32px; margin: 0; ${styles.highlight}">${newPhase}</h2>
                <p style="color: #888; margin-top: 8px;">(原階段: ${oldPhase})</p>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <p style="margin:0;"><strong>當前分數: ${score.toFixed(0)}/100</strong></p>
                </div>
            </div>

            <p>此階段轉變顯示潛在的市場結構改變，請重新檢視您的策略。</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">查看反轉指數</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. 系統通知。</p>
        </div>
    </div>`;
}

// 3. Weekly Report
export function generateWeeklyReport(summary: string, topSignals: any[]) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">📊 每週市場摘要</h2>
        </div>
        <div style="${styles.content}">
            <h3 style="margin-top:0;">本週摘要</h3>
            <p>${summary}</p>
            
            <h3 style="margin-top: 24px;">重點市場異動</h3>
            ${topSignals.map(s => `
                <div style="${styles.card}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${s.title}</strong>
                        <span style="font-weight:bold;">${s.prob}%</span>
                    </div>
                </div>
            `).join('')}
            
            <p>保持領先，建立您的信仰系統。</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">開啟儀表板</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. 每週週報。</p>
        </div>
    </div>`;
}

// 4. Welcome / Thank You Email
export function generateWelcomeEmail(userName: string = 'Believer') {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">歡迎來到 BetalphaX</h2>
        </div>
        <div style="${styles.content}">
            <h3>嗨 ${userName},</h3>
            <p>感謝您加入 <strong>BetAlphaX</strong> - 數據與信仰的交會點。</p>
            
            <p>您現在已擁有一套強大的系統，協助您：</p>
            <ul>
                <li>追蹤預測市場的即時機率變動。</li>
                <li>利用反轉指數識別結構性趨勢反轉。</li>
                <li>建立有紀律、數據驅動的交易框架。</li>
            </ul>
            
            <p>「除了上帝，其他人都必須用數據說話。」</p>

            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">開始您的旅程</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. 感謝您的使用。</p>
        </div>
    </div>`;
}
