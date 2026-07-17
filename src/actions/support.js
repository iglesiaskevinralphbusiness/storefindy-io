"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, SupportTicketModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { plans } from '@/utils/constant/pricing';

// The topics a visitor can pick in the contact form. Kept in sync with the
// select options rendered on the page.
const TOPICS = [
    'Widget not loading',
    'CSV import issue',
    'Billing & payments',
    'Account access',
    'Feature request',
    'Analytics question',
    'Subdomain help',
    'Other',
];

function buildReference(seq) {
    // Year + per-year sequence keeps the reference human-readable and unique.
    const year = new Date().getFullYear();
    return `SUP-${year}-${String(seq).padStart(3, '0')}`;
}

export async function submitSupportTicket(_prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        topic: sanitizeInput((formData.get('topic') || '').toString().trim()),
        message: sanitizeInput((formData.get('message') || '').toString().trim()),
        plan: sanitizeInput((formData.get('plan') || '').toString().trim()).slice(0, 60),
        page_url: sanitizeInput((formData.get('page_url') || '').toString().trim()).slice(0, 300),
    };

    // Validation
    const errors = {};
    if (form.topic && !TOPICS.includes(form.topic)) {
        errors.topic = 'Invalid topic';
    }
    if (!form.message) {
        errors.message = 'Please describe your issue or question';
    } else if (form.message.length > 2000) {
        errors.message = 'Message must be 2000 characters or fewer';
    }

    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    try {
        const year = new Date().getFullYear();
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const seq = (await SupportTicketModel.countDocuments({ createdAt: { $gte: start } })) + 1;
        const reference = buildReference(seq);

        await SupportTicketModel.create({
            user_id: session.user.id,
            email: session.user.email || '',
            reference,
            topic: form.topic,
            message: form.message,
            plan: form.plan,
            page_url: form.page_url,
            status: 'open',
        });

        return {
            status: "success",
            reference,
            message: 'Your message has been sent. We\'ll reply within 24–48 hours.',
        };
    } catch {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function getSupportContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findById(session.user.id).lean();
    const plan = plans.find((p) => p.id === user?.plan) || plans[0];

    const recent = await SupportTicketModel
        .find({ user_id: session.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    const previousTickets = recent.map((t) => ({
        id: String(t._id),
        reference: t.reference || '',
        topic: t.topic || '',
        status: t.status || 'open',
        created_at: t.createdAt ? new Date(t.createdAt).toISOString() : '',
    }));

    return {
        userId: String(session.user.id),
        email: session.user.email || '',
        planId: plan.id,
        planName: plan.name,
        // Priority support is a Business-plan perk.
        priority: plan.id === 'business',
        previousTickets,
    };
}
