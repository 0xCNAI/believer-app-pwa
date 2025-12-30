
/**
 * Mock Email Service
 * Simulates sending transactional emails for testing purposes.
 * Returns the rendered HTML for client-side preview.
 */

export type EmailTemplateType = 'STAGE_UPGRADE' | 'GATE_CONFIRMATION' | 'WEEKLY_REPORT';

interface EmailData {
    recipientName: string;
    [key: string]: any;
}

export const generateEmailHtml = (type: EmailTemplateType, data: EmailData): { subject: string, html: string } => {
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

        case 'GATE_CONFIRMATION':
            return {
                subject: `✅ Tech Alert: [${data.gateName}] Confirmed`,
                html: `
<div style="font-family: sans-serif; color: #18181b; padding: 20px;">
  <p>Hi ${data.recipientName},</p>
  <p>A key technical requirement for the Bull Market Reversal has been confirmed.</p>
  
  <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <h3 style="margin: 0; color: #16a34a;">✅ ${data.gateName} Structure</h3>
    <p style="color: #71717a; font-size: 14px; margin-top: 5px;">Timeframe: Weekly</p>
  </div>

  <p>This increases the Phase Cap to <strong>${data.newCap}</strong>. The system is now uncapped for a full reversal.</p>
  
  <a href="https://believer-app.com" style="color: #4f46e5;">Check Charts -></a>
</div>`
            };

        case 'WEEKLY_REPORT':
            return {
                subject: `🕯️ Your Week in Belief: +${data.weeklyMerit} Merit`,
                html: `
<div style="font-family: sans-serif; color: #18181b; padding: 20px;">
  <h2 style="color: #fb923c;">Weekly Merit Report</h2>
  <p>${data.recipientName}, your faith is helping power the network.</p>
  
  <table style="width: 100%; text-align: left; margin: 20px 0; border-collapse: collapse;">
    <tr>
      <th style="color: #71717a; font-weight: normal; padding: 8px 0;">This Week</th>
      <th style="color: #71717a; font-weight: normal; padding: 8px 0;">Total Rank</th>
    </tr>
    <tr>
      <td style="font-size: 24px; font-weight: bold; padding: 8px 0;">+${data.weeklyMerit}</td>
      <td style="font-size: 24px; font-weight: bold; padding: 8px 0;">#${data.rank}</td>
    </tr>
  </table>
  
  <p style="color: #71717a; font-size: 14px;">Contribution to Global Alpha: ${data.contributionPct}%</p>
  
  <div style="text-align: center; margin-top: 30px;">
    <a href="https://believer-app.com" style="background: #fb923c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; display: inline-block;">Knock Wooden Fish</a>
  </div>
</div>`
            };
    }
};
