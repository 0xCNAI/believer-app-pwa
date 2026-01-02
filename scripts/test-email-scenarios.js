
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

// --- Template Generators ---

function generateVolatilityAlert(signalName, changePercent, currentProb, previousProb) {
    const isPositive = changePercent > 0;
    const colorStyle = isPositive ? styles.alertPositive : styles.alertNegative;
    const arrow = isPositive ? '↑' : '↓';
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">⚠️ Market Alert: ${signalName}</h2></div>
        <div style="${styles.content}">
            <p>We detected significant market movement in the last 24 hours.</p>
            <div style="${styles.card}">
                <h3 style="margin-top:0;">${signalName}</h3>
                <p style="font-size: 24px; margin: 8px 0;"><span style="${colorStyle}">${arrow} ${Math.abs(changePercent).toFixed(1)}%</span></p>
                <p style="margin: 0; color: #666;">Probability changed from <strong>${(previousProb * 100).toFixed(0)}%</strong> to <strong>${(currentProb * 100).toFixed(0)}%</strong>.</p>
            </div>
            <p>Market sentiment is shifting rapidly. Check the app for detailed analysis.</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">View Market Analysis</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. System Alert.</p></div>
    </div>`;
}

function generatePhaseChangeAlert(oldPhase, newPhase, score) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">🔄 System Phase Update</h2></div>
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
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">Check Reversal Index</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. System Notification.</p></div>
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
        <div style="${styles.header}"><h2 style="margin:0;">📊 Weekly Market Digest</h2></div>
        <div style="${styles.content}">
            <h3 style="margin-top:0;">This Week's Summary</h3>
            <p>${summary}</p>
            <h3 style="margin-top: 24px;">Top Market Movers</h3>
            ${signalHtml}
            <p>Stay ahead of the curve. Build your belief system.</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">Open Dashboard</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. Weekly Report.</p></div>
    </div>`;
}

function generateWelcomeEmail(name) {
    return `
    <div style="${styles.container}">
        <div style="${styles.header}"><h2 style="margin:0;">Welcome to BetalphaX</h2></div>
        <div style="${styles.content}">
            <h3>Hi ${name},</h3>
            <p>Thank you for joining <strong>BetAlphaX</strong> - where data meets belief.</p>
            <p>You are now part of a system designed to help you:</p>
            <ul>
                <li>Track probability shifts in real-time prediction markets.</li>
                <li>Identify structural trend reversals with our Reversal Index.</li>
                <li>Build a disciplined, data-driven trading framework.</li>
            </ul>
            <p>"In god we trust, all others must bring data."</p>
            <div style="text-align: center;"><a href="https://betalphax.vercel.app/" style="${styles.button}">Start Your Journey</a></div>
        </div>
        <div style="${styles.footer}"><p>© 2025 BetalphaX. Thank you for using our product.</p></div>
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
    console.log('🚀 Starting Email Scenario Tests...');
    console.log(`To: ${TARGET_EMAIL}`);
    console.log(`From: ${SENDER_EMAIL}`);

    // 1. Volatility Alert (>30% Change)
    await sendTest(
        'Volatility Alert',
        '🚨 Market Alert: US Recession Risk Spikes > 30%',
        generateVolatilityAlert('US Recession Risk', 32.5, 0.45, 0.125)
    );

    // 2. Phase Change (Reversal Index)
    await sendTest(
        'Phase Change',
        '🔄 Phase Update: WATCH to PREPARE',
        generatePhaseChangeAlert('WATCH', 'PREPARE', 65)
    );

    // 3. Weekly Report
    await sendTest(
        'Weekly Report',
        '📊 BetAlphaX Weekly Digest: Fed Pivot Likely?',
        generateWeeklyReport(
            'The market is pricing in a 75% chance of a Fed cut in January, driven by cooling CPI data. Volatility remains compressed but shows signs of expansion.',
            [
                { title: 'Fed Rate Cut (Jan)', prob: 75 },
                { title: 'BTC Strategic Reserve', prob: 24 },
                { title: 'Gov Shutdown Risk', prob: 12 }
            ]
        )
    );

    // 4. Welcome Email
    await sendTest(
        'Welcome Email',
        'Welcome to BetAlphaX - Your Journey Begins',
        generateWelcomeEmail('Trader')
    );

    console.log('\n✨ All tests completed.');
}

runAllTests();
