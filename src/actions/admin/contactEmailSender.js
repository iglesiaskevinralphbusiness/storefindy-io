"use server";

import { z } from 'zod';
import { sendSupportEmail } from '@/lib/send-support-email';
import { requireAdmin } from '@/actions/admin/prospectCustomerActions';

const emailSchema = z.email('Enter a valid email address.');

export async function sendContactEmail(_prevState, formData) {
    await requireAdmin();

    const rawEmail = String(formData.get('email') || '').trim().toLowerCase();
    const parsed = emailSchema.safeParse(rawEmail);

    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message || 'Enter a valid email address.',
        };
    }

    try {
        await sendSupportEmail(parsed.data);
        return {
            success: true,
            email: parsed.data,
        };
    } catch (error) {
        console.error('[contactEmailSender]', error);

        return {
            success: false,
            error: 'Failed to send email. Check SMTP credentials and try again.',
            detail: error?.message || '',
        };
    }
}
