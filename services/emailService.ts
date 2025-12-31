import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { EmailTemplateType, generateEmailHtml } from './mockEmailService';
import { useAuthStore } from '@/stores/authStore';

export interface EmailDeliveryStatus {
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'ERROR';
}

/**
 * Sends a transactional email by writing a document to the 'mail' collection.
 * This triggers the Firebase Trigger Email Extension.
 */
export const sendTrafficEmail = async (
    type: EmailTemplateType,
    data: any,
    recipientEmail?: string
): Promise<string> => {

    // 1. Resolve Recipient
    const user = useAuthStore.getState().user;
    const targetEmail = recipientEmail || user?.email;

    if (!targetEmail) {
        throw new Error("No recipient email found. Please login or provide an email.");
    }

    // 2. Generate Content
    const { subject, html } = generateEmailHtml(type, data);

    // 3. Construct Payload for Firebase Extension
    const mailPayload = {
        to: [targetEmail],
        message: {
            subject: subject,
            html: html,
        },
        delivery: {
            state: 'PENDING',
            attempts: 0
        },
        metadata: {
            type,
            userId: user?.id || 'anonymous',
            createdAt: Date.now()
        }
    };

    try {
        // 4. Write to Firestore
        const docRef = await addDoc(collection(db, 'mail'), mailPayload);
        console.log(`[EmailService] Email queued. ID: ${docRef.id} -> ${targetEmail}`);
        return docRef.id;
    } catch (error) {
        console.error('[EmailService] Failed to queue email:', error);
        throw error;
    }
};
