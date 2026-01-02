
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail');

// 1. Load Environment Variables manually
const envPath = path.resolve(__dirname, '../.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim();
    }
});

const API_KEY = process.env.SENDGRID_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: SENDGRID_API_KEY not found in .env');
    process.exit(1);
}

// 2. Configure SendGrid
sgMail.setApiKey(API_KEY);

const TARGET_EMAIL = 'jochang4053@gmail.com';
const SENDER_EMAIL = 'no-reply@mg.betalpha.app';

// 3. Import Templates Logic (Inline for script simplicity, mirroring `services/emailTemplates.ts`)
// Re-implementing simplified logic here to run as standalone node script without TS compliation issues
const styles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;',
    header: 'background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;',
    content: 'padding: 24px; border: 1px solid #eee; border-top: none; background-color: #fafafa;',
    footer: 'text-align: center; margin-top: 20px; font-size: 12px; color: #888;',
    button: 'display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; margin-top: 16px; font-weight: bold;',
    alertNegative: 'color: #dc2626; font-weight: bold;',
    alertPositive: 'color: #16a34a; font-weight: bold;',
    highlight: 'color: #2563eb; font-weight: bold;',
    card: 'background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 12px;'
};

// --- Template Generators (Chinese Version) ---

function generateVolatilityAlert(signalName, changePercent, currentProb, previousProb) {
    const isPositive = changePercent > 0;
    const colorStyle = isPositive ? styles.alertPositive : styles.alertNegative;
    const arrow = isPositive ? '↑' : '↓';
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">⚠️ 市場警示: ${signalName}</h2></div>
        <div style="${styles.content}">
            <p>在過去 24 小時內，我們偵測到顯著的市場波動。</p>
            <div style="${styles.card}">
                <h3 style="margin-top:0;">${signalName}</h3>
                <p style="font-size: 24px; margin: 8px 0;"><span style="${colorStyle}">${arrow} ${Math.abs(changePercent).toFixed(1)}%</span></p>
                <p style="margin: 0; color: #666;">機率從 <strong>${(previousProb * 100).toFixed(0)}%</strong> 變動至 <strong>${(currentProb * 100).toFixed(0)}%</strong>。</p>
            </div>
            <p>市場情緒正在快速轉變，請查看 App 以獲取詳細分析。</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">查看市場分析</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. 版權所有。</p></div>
    </div>`;
}

function generatePhaseChangeAlert(oldPhase, newPhase, score) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">🔄 系統階段更新</h2></div>
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
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">查看反轉指數</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. 系統通知。</p></div>
    </div>`;
}

function generateWeeklyReport(summary, topSignals) {
    const signalHtml = topSignals.map(s => `
        <div style="${styles.card}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${s.title}</strong><span style="font-weight:bold;">${s.prob}%</span>
            </div>
        </div>`).join('');

    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">📊 每週市場摘要</h2></div>
        <div style="${styles.content}">
            <h3 style="margin-top:0;">本週摘要</h3>
            <p>${summary}</p>
            <h3 style="margin-top: 24px;">重點市場異動</h3>
            ${signalHtml}
            <p>保持領先，建立您的信仰系統。</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">開啟儀表板</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. 每週週報。</p></div>
    </div>`;
}

function generateWelcomeEmail(name) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">歡迎來到 BetalphaX</h2></div>
        <div style="${styles.content}">
            <h3>嗨 ${name},</h3>
            <p>感謝您加入 <strong>BetAlphaX</strong> - 數據與信仰的交會點。</p>
            <p>您現在已擁有一套強大的系統，協助您：</p>
            <ul>
                <li>追蹤預測市場的即時機率變動。</li>
                <li>利用反轉指數識別結構性趨勢反轉。</li>
                <li>建立有紀律、數據驅動的交易框架。</li>
            </ul>
            <p>「除了上帝，其他人都必須用數據說話。」</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">開始您的旅程</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. 感謝您的使用。</p></div>
    </div>`;
}

// --- Run Tests Sequentially ---

async function sendTest(scenarioName, subject, html) {
    console.log(`\n⏳ Sending [${scenarioName}]...`);
    try {
        await sgMail.send({
            to: TARGET_EMAIL,
            from: SENDER_EMAIL,
            subject: subject,
            html: html,
        });
        console.log(`✅ [${scenarioName}] Sent successfully!`);
    } catch (error) {
        console.error(`❌ [${scenarioName}] Failed:`, error.message);
        if (error.response) console.error(error.response.body);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Email Scenario Tests (Chinese)...');
    console.log(`To: ${TARGET_EMAIL}`);
    console.log(`From: ${SENDER_EMAIL}`);

    // 1. Volatility Alert (>30% Change)
    await sendTest(
        'Volatility Alert',
        '🚨 市場警示: 美國衰退風險飆升 > 30%',
        generateVolatilityAlert('美國衰退風險', 32.5, 0.45, 0.125)
    );

    // 2. Phase Change (Reversal Index)
    await sendTest(
        'Phase Change',
        '🔄 階段更新: 從 WATCH 轉為 PREPARE',
        generatePhaseChangeAlert('WATCH', 'PREPARE', 65)
    );

    // 3. Weekly Report
    await sendTest(
        'Weekly Report',
        '📊 BetAlphaX 每週摘要: Fed 轉向機率大增?',
        generateWeeklyReport(
            '本週市場定價顯示一月降息機率達 75%，主要受到 CPI 降溫數據驅動。波動率仍處低位，但有擴張跡象。',
            [
                { title: 'Fed 利率決策 (Jan)', prob: 75 },
                { title: 'BTC 戰略儲備', prob: 24 },
                { title: '政府停擺風險', prob: 12 }
            ]
        )
    );

    // 4. Welcome Email
    await sendTest(
        'Welcome Email',
        '歡迎來到 BetAlphaX - 我們將一起探索真實',
        generateWelcomeEmail('Trader')
    );

    console.log('\n✨ All tests completed.');
}

runAllTests();
