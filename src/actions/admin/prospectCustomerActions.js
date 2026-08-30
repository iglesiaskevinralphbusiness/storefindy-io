"use server";

import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { ProspectCustomerModel } from '@/mongo';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';

const ADMIN_PATH = '/admin/contact-email-finder';

export async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }
    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }
    await dbConnect();
    return session;
}

function mapProspectItem(doc) {
    const item = doc.toObject ? doc.toObject() : doc;
    return {
        _id: String(item._id),
        site_url: item.site_url || '',
        domain: item.domain || '',
        company_name: item.company_name || '',
        email: item.email || '',
        emails_found: item.emails_found || [],
        score: item.score || 0,
        score_reason: item.score_reason || '',
        score_breakdown: item.score_breakdown || [],
        estimated_location_count: item.estimated_location_count || 0,
        has_multiple_locations: Boolean(item.has_multiple_locations),
        has_store_locator: Boolean(item.has_store_locator),
        existing_locator: item.existing_locator || '',
        store_locator_confidence: item.store_locator_confidence || 0,
        store_locator_evidence: item.store_locator_evidence || [],
        location_evidence: item.location_evidence || [],
        status: item.status || 'pending',
        analyzed_at: item.analyzed_at ? new Date(item.analyzed_at).toISOString() : '',
        created_at: item.createdAt ? new Date(item.createdAt).toISOString() : '',
        updated_at: item.updatedAt ? new Date(item.updatedAt).toISOString() : '',
    };
}

export async function getAdminProspectCustomers() {
    await requireAdmin();

    const [pending, done] = await Promise.all([
        ProspectCustomerModel.find({ status: 'pending' }).sort({ createdAt: -1 }).lean(),
        ProspectCustomerModel.find({ status: 'done' }).sort({ createdAt: -1 }).lean(),
    ]);

    const items = [...pending, ...done].map(mapProspectItem);

    return {
        items: serializeForClient(items),
        pending_count: pending.length,
        done_count: done.length,
    };
}

export async function deleteProspectCustomer(prospectId) {
    await requireAdmin();

    if (!isValidObjectId(prospectId)) {
        return { status: 'error', message: 'Invalid prospect ID.' };
    }

    const deleted = await ProspectCustomerModel.findByIdAndDelete(prospectId);
    if (!deleted) {
        return { status: 'error', message: 'Prospect not found.' };
    }

    revalidatePath(ADMIN_PATH);
    return { status: 'success', message: 'Prospect deleted.' };
}

export async function markProspectCustomerDone(prospectId) {
    await requireAdmin();

    if (!isValidObjectId(prospectId)) {
        return { status: 'error', message: 'Invalid prospect ID.' };
    }

    const prospect = await ProspectCustomerModel.findByIdAndUpdate(
        prospectId,
        { $set: { status: 'done' } },
        { new: true, runValidators: true }
    );

    if (!prospect) {
        return { status: 'error', message: 'Prospect not found.' };
    }

    revalidatePath(ADMIN_PATH);
    return { status: 'success', message: 'Marked as done.', prospect_status: 'done' };
}

export async function markProspectCustomerPending(prospectId) {
    await requireAdmin();

    if (!isValidObjectId(prospectId)) {
        return { status: 'error', message: 'Invalid prospect ID.' };
    }

    const prospect = await ProspectCustomerModel.findByIdAndUpdate(
        prospectId,
        { $set: { status: 'pending' } },
        { new: true, runValidators: true }
    );

    if (!prospect) {
        return { status: 'error', message: 'Prospect not found.' };
    }

    revalidatePath(ADMIN_PATH);
    return { status: 'success', message: 'Marked as pending.', prospect_status: 'pending' };
}
