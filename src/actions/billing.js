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

    return {
        id: user.plan,
        status: user.plan === 'free' ? 'free' : 'active',
        planName: (user.plan).charAt(0).toUpperCase() + (user.plan).slice(1),
        billingEmail: user.email,
        planStarted: user.plan_started ? user.plan_started : '-',
        planStartedLabel: user.plan === 'free' ? 'Plan started' : 'Subscribed since',
        renewal: user.plan_renewal ? user.plan_renewal : '-',

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
                used: locator > 1 ? 1 : locator,
                limit: plan.max_locator,
                inactive: locator - plan.max_locator,
                percent: 100,
                fill: 'warn',
                hint: 'Limit reached. Upgrade to create more.'
            },
            {
                icon: <TbMapPin />,
                label: 'Locations',
                used: 12,
                limit: '25',
                percent: 48,
                fill: '',
                hint: '13 locations remaining.'
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
