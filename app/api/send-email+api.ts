
import sgMail from '@sendgrid/mail';

export async function POST(request: Request) {
    try {
        const { to, subject, html } = await request.json();

        if (!process.env.SENDGRID_API_KEY) {
            return Response.json({ error: 'SendGrid API Key not configured' }, { status: 500 });
        }

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to,
            from: 'no-reply@mg.betalpha.app', // Verified sender
            subject,
            html,
        };

        await sgMail.send(msg);

        return Response.json({ success: true });
    } catch (error: any) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return Response.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
