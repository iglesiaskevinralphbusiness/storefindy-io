"use server";
import { dbConnect } from '@/config/mongo.config';
import { SupportTicketModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';

// Topics a visitor can pick in the public contact form. Kept in sync with the
// select options rendered on the contact-us page.
const TOPICS = [
    'Sales & pricing',
    'Technical support',
    'Billing & subscriptions',
    'Partnership',
    'Product feedback',
    'Something else',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildReference(seq) {
    // Year + per-year sequence keeps the reference human-readable and unique.
    const year = new Date().getFullYear();
    return `CON-${year}-${String(seq).padStart(3, '0')}`;
}

// Public contact form — no session required. Mirrors the shape of
// submitSupportTicket so the form uses the same useActionState pattern, but
// captures the visitor's name/email since there is no logged-in account.
export async function submitContactMessage(_prev, formData) {
    await dbConnect();

    const form = {
        name: sanitizeInput((formData.get('name') || '').toString().trim()).slice(0, 120),
        email: sanitizeInput((formData.get('email') || '').toString().trim()).slice(0, 200),
        topic: sanitizeInput((formData.get('topic') || '').toString().trim()),
        message: sanitizeInput((formData.get('message') || '').toString().trim()),
        page_url: sanitizeInput((formData.get('page_url') || '').toString().trim()).slice(0, 300),
    };

    // Validation
    const errors = {};
    if (!form.name) {
        errors.name = 'Please enter your name';
    }
    if (!form.email) {
        errors.email = 'Please enter your email';
    } else if (!EMAIL_RE.test(form.email)) {
        errors.email = 'Please enter a valid email';
    }
    if (form.topic && !TOPICS.includes(form.topic)) {
        errors.topic = 'Invalid topic';
    }
    if (!form.message) {
        errors.message = 'Please tell us how we can help';
    } else if (form.message.length < 10) {
        errors.message = 'A little more detail helps us reply faster';
    } else if (form.message.length > 2000) {
        errors.message = 'Message must be 2000 characters or fewer';
    }

    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    try {
        const year = new Date().getFullYear();
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const seq = (await SupportTicketModel.countDocuments({
            user_id: 'guest',
            createdAt: { $gte: start },
        })) + 1;
        const reference = buildReference(seq);

        await SupportTicketModel.create({
            user_id: 'guest',
            email: form.email,
            reference,
            // Prefix the message with the visitor's name so the team has context
            // even though there is no linked account.
            topic: form.topic || 'Something else',
            message: `From: ${form.name} <${form.email}>\n\n${form.message}`,
            plan: '',
            page_url: form.page_url,
            status: 'open',
        });

        return {
            status: "success",
            reference,
            message: "Your message has been sent. We'll reply within 1 business day.",
        };
    } catch {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}
