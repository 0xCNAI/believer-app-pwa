
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

const msg = {
    to: 'jochang4053@gmail.com',
    from: 'no-reply@mg.betalpha.app', // Verified sender
    subject: 'Believer App - SendGrid Test Verification',
    text: 'This is a verification email from your Believer App integration test.',
    html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #2563eb;">It Works! 🎉</h1>
      <p>Your SendGrid integration is successfully configured.</p>
      <ul>
        <li><strong>Sender:</strong> support@betalpha.app</li>
        <li><strong>Recipient:</strong> jochang4053@gmail.com</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>You can now proceed with integrating email notifications into your app logic.</p>
    </div>
  `,
};

console.log('📧 Attempting to send test email...');

sgMail
    .send(msg)
    .then(() => {
        console.log('✅ Email sent successfully!');
    })
    .catch((error) => {
        console.error('❌ Failed to send email:', error);
        if (error.response) {
            console.error('Full Error Body:', JSON.stringify(error.response.body, null, 2));
        }
    });
