
export const SendGridService = {
    /**
     * Send an email via the server-side API route
     * @param to Recipient email address
     * @param subject Email subject
     * @param html Email content (HTML)
     */
    sendEmail: async (to: string, subject: string, html: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ to, subject, html }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send email');
            }

            return true;
        } catch (error) {
            console.error('SendGridService Error:', error);
            throw error;
        }
    }
};
