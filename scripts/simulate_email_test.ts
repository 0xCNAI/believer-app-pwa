
// Mock Service Logic (Inlined for standalone execution)
type EmailTemplateType = 'STAGE_UPGRADE' | 'GATE_CONFIRMATION' | 'WEEKLY_REPORT';

interface EmailData {
    recipientName: string;
    [key: string]: any;
}

const generateEmailHtml = (type: EmailTemplateType, data: EmailData): { subject: string, html: string } => {
    switch (type) {
        case 'STAGE_UPGRADE':
            return {
                subject: `🔔 Market Status Update: Entering [${data.stage}] Phase`,
                html: `
<div style="font-family: sans-serif; color: #18181b; padding: 20px;">
  <h2 style="color: #4f46e5;">Believer System Alert</h2>
  <p>Hi ${data.recipientName},</p>
  <p>The Reversal Index has detected a significant structural shift.</p>
  
  <div style="background: #f4f4f5; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
    <h3 style="margin: 0;">New Phase: ${data.stage}</h3>
    <p style="margin: 5px 0 0;">Score: <strong>${data.score}/100</strong></p>
  </div>

  <p><strong>Why this matters:</strong></p>
  <ul>
    <li>Technical Gates: ${data.gatesPassed}/4 Passed</li>
    <li>On-Chain Cycle: ${data.cycleZone}</li>
  </ul>
  
  <a href="https://believer-app.com" style="background: #18181b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Deep Dive</a>
</div>`
            };
        default: return { subject: '', html: '' };
    }
};

const runTest = () => {
    console.log('[EmailService] Simulating SMTP connection...');

    const recipient = '0xcryptonewsi@gmail.com';
    const templateType = 'STAGE_UPGRADE';
    const data = {
        recipientName: 'CryptoNews AI',
        stage: 'PREPARE',
        score: 65,
        gatesPassed: 3,
        cycleZone: 'STRONG'
    };

    const { subject, html } = generateEmailHtml(templateType, data);

    console.log(`[EmailService] Sending to: ${recipient}`);
    console.log(`[EmailService] Subject: ${subject}`);
    console.log('[EmailService] Body Preview:');
    console.log('---------------------------------------------------');
    console.log(html);
    console.log('---------------------------------------------------');
    console.log('[EmailService] Status: SENT (Mock)');
};

runTest();
