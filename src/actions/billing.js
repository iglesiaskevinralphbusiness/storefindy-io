"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';
import { TbMap, TbMapPin, TbEye } from 'react-icons/tb';

export async function getBillingStatus() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findOne({ _id: session.user.id }).lean();
    const locator = await LocatorModel.countDocuments({ user_id: session.user.id });
    const location = await LocationModel.countDocuments({ user_id: session.user.id });

    const plan = plans.find(p => p.id === user.plan) || plans[0];

    const locator_used = locator > plan.max_locator ? plan.max_locator : locator;
    const locator_inactive = locator - plan.max_locator;
    const locator_percent = (locator_used / plan.max_locator) * 100;

    const location_used = location > plan.max_location ? plan.max_location : location;
    const location_inactive = location - plan.max_location;
    const location_percent = (location_used / plan.max_location) * 100;

    return {
        id: user.plan,
        status: user.plan === 'free' ? 'free' : (user.status || 'active'),
        planName: (user.plan).charAt(0).toUpperCase() + (user.plan).slice(1),
        billingEmail: user.email,
        planStarted: user.plan_started ? user.plan_started : '-',
        planStartedLabel: user.plan === 'free' ? 'Plan started' : 'Subscribed since',
        renewal: user.renewal_date ? user.renewal_date : '-',

        locator_max: plan.max_locator,
        locator_count: locator,
        locator_is_limit_reached: locator >= plan.max_locator,

        location_max: plan.max_location,
        location_count: location,
        location_is_limit_reached: location >= plan.max_location,

        usage: [
            {
                icon: <TbMap />,
                label: 'Locators',
                used: locator_used,
                limit: plan.max_locator,
                inactive: locator_inactive,
                percent: locator_percent,
                fill: locator_percent >= 100 ? 'warn' : '',
                hint: locator_percent >= 100 ? `Limit reached${locator_inactive > 0 ? ` and ${locator_inactive} inactive` : ''}. Upgrade to ${locator_inactive > 0 ? `enable them` : 'create more'}.` : `${plan.max_locator - locator_used} locators remaining.`
            },
            {
                icon: <TbMapPin />,
                label: 'Locations',
                used: location_used,
                limit: plan.max_location,
                inactive: location_inactive,
                percent: location_percent,
                fill: location_percent >= 100 ? 'warn' : '',
                hint: location_percent >= 100 ? `Limit reached${location_inactive > 0 ? ` and ${location_inactive} locations inactive` : ''}. Upgrade to ${location_inactive > 0 ? `enable them` : 'create more'}.` : `${plan.max_location - location_used} locations remaining.`
            },
            {
                icon: <TbEye />,
                label: 'Widget Views',
                used: '1,204',
                limit: 'unlimited',
                percent: 100,
                fill: 'ok',
                hint: 'Unlimited on all plans.'
            },
        ],
    }

}
