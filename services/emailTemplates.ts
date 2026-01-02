
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
            <h2 style="margin:0;">⚠️ Market Alert: ${signalName}</h2>
        </div>
        <div style="${styles.content}">
            <p>We detected significant market movement in the last 24 hours.</p>
            
            <div style="${styles.card}">
                <h3 style="margin-top:0;">${signalName}</h3>
                <p style="font-size: 24px; margin: 8px 0;">
                    <span style="${colorStyle}">${arrow} ${Math.abs(changePercent).toFixed(1)}%</span>
                </p>
                <p style="margin: 0; color: #666;">
                    Probability changed from <strong>${(previousProb * 100).toFixed(0)}%</strong> to <strong>${(currentProb * 100).toFixed(0)}%</strong>.
                </p>
            </div>

            <p>Market sentiment is shifting rapidly. Check the app for detailed analysis.</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">View Market Analysis</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. All rights reserved.</p>
        </div>
    </div>`;
}

// 2. Phase Change Alert
export function generatePhaseChangeAlert(oldPhase: string, newPhase: string, score: number) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">🔄 System Phase Update</h2>
        </div>
        <div style="${styles.content}">
            <p>The <strong>Believer Reversal Index</strong> has entered a new phase.</p>
            
            <div style="${styles.card}; text-align: center;">
                <p style="color: #666; font-size: 14px; margin-bottom: 4px;">Current Phase</p>
                <h2 style="font-size: 32px; margin: 0; ${styles.highlight}">${newPhase}</h2>
                <p style="color: #888; margin-top: 8px;">(Previous: ${oldPhase})</p>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <p style="margin:0;"><strong>Current Score: ${score.toFixed(0)}/100</strong></p>
                </div>
            </div>

            <p>This phase shift indicates a change in underlying market structure. Please review your strategy accordingly.</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">Check Reversal Index</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. System Notification.</p>
        </div>
    </div>`;
}

// 3. Weekly Report
export function generateWeeklyReport(summary: string, topSignals: any[]) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">📊 Weekly Market Digest</h2>
        </div>
        <div style="${styles.content}">
            <h3 style="margin-top:0;">This Week's Summary</h3>
            <p>${summary}</p>
            
            <h3 style="margin-top: 24px;">Top Market Movers</h3>
            ${topSignals.map(s => `
                <div style="${styles.card}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${s.title}</strong>
                        <span style="font-weight:bold;">${s.prob}%</span>
                    </div>
                </div>
            `).join('')}
            
            <p>Stay ahead of the curve. Build your belief system.</p>
            
            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">Open Dashboard</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. Weekly Report.</p>
        </div>
    </div>`;
}

// 4. Welcome / Thank You Email
export function generateWelcomeEmail(userName: string = 'Believer') {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}">
            <h2 style="margin:0;">Welcome to BetalphaX</h2>
        </div>
        <div style="${styles.content}">
            <h3>Hi ${userName},</h3>
            <p>Thank you for joining <strong>BetAlphaX</strong> - where data meets belief.</p>
            
            <p>You are now part of a system designed to help you:</p>
            <ul>
                <li>Track probability shifts in real-time prediction markets.</li>
                <li>Identify structural trend reversals with our Reversal Index.</li>
                <li>Build a disciplined, data-driven trading framework.</li>
            </ul>
            
            <p>"In god we trust, all others must bring data."</p>

            <div style="text-align: center;">
                <a href="https://betalphax.vercel.app/" style="${styles.button}">Start Your Journey</a>
            </div>
        </div>
        <div style="${styles.footer}">
            <p>© 2025 BetalphaX. Thank you for using our product.</p>
        </div>
    </div>`;
}
