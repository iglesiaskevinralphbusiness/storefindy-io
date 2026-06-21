"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';

export async function getProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const userDoc = await UserModel.findById(session.user.id);
    if (!userDoc) {
        redirect('/sign-in');
    }
    const user = userDoc.toObject();

    const locator_count = await LocatorModel.countDocuments({ user_id: session.user.id });
    const location_count = await LocationModel.countDocuments({ user_id: session.user.id });

    const plan = plans.find(p => p.id === user.plan) || plans[0];

    return {
        id: String(user._id),
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        display_name: user.display_name || '',
        company: user.company || '',
        country: user.country || '',
        timezone: user.timezone || '',
        provider: user.provider || 'google',
        plan: plan.id,
        planName: plan.name,
        status: user.plan === 'free' ? 'free' : (user.status || 'active'),
        created_at: user.created_at || '',
        last_login_at: user.last_login_at || '',
        locator_count,
        location_count,
    };
}

export async function updateProfile(_prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        first_name: sanitizeInput((formData.get('first_name') || '').toString().trim()),
        last_name: sanitizeInput((formData.get('last_name') || '').toString().trim()),
        display_name: sanitizeInput((formData.get('display_name') || '').toString().trim()),
        company: sanitizeInput((formData.get('company') || '').toString().trim()),
        country: sanitizeInput((formData.get('country') || '').toString().trim()),
        timezone: sanitizeInput((formData.get('timezone') || '').toString().trim()),
    };

    // manual validation
    const errors = {};
    if (form.first_name.length > 60) {
        errors.first_name = 'First name must be 60 characters or fewer';
    }
    if (form.last_name.length > 60) {
        errors.last_name = 'Last name must be 60 characters or fewer';
    }
    if (form.display_name.length > 80) {
        errors.display_name = 'Display name must be 80 characters or fewer';
    }
    if (form.company.length > 120) {
        errors.company = 'Company must be 120 characters or fewer';
    }
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    try {
        await UserModel.findByIdAndUpdate(session.user.id, form, { new: true });
        return { status: "success", message: 'Profile updated successfully' };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function exportMyData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) {
        redirect('/sign-in');
    }

    const locators = await LocatorModel.find({ user_id: session.user.id }).lean();
    const locations = await LocationModel.find({ user_id: session.user.id }).lean();

    // strip sensitive billing identifiers from the exported account record
    const {
        ls_customer_id, ls_subscription_id, ls_order_id,
        ls_product_id, ls_variant_id, ...account
    } = user;

    return serializeForClient({
        exported_at: new Date().toISOString(),
        account,
        locators,
        locations,
    });
}

export async function deleteMyAccount() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    try {
        await LocationModel.deleteMany({ user_id: session.user.id });
        await LocatorModel.deleteMany({ user_id: session.user.id });
        await UserModel.findByIdAndDelete(session.user.id);
        return { status: "success", message: 'Account deleted successfully' };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}
