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
    console.log(location);

    const plan = plans.find(p => p.id === user.plan) || plans[0];
    
    if(user.plan === 'free') {
        return {
            status: 'free',
            planName: 'Free',
            billingEmail: user.email,
            planStarted: '-',
            planStartedLabel: 'Plan started',
            renewal: null,

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
                    limit: '1',
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

    return {
        status: 'active',
        planName: 'Pro',
        billingEmail: 'mystore@email.com',
        planStarted: 'April 1, 2026',
        planStartedLabel: 'Subscribed since',
        renewal: 'July 1, 2026',
        usage: [
            { icon: <TbMap />, label: 'Locators', used: 2, limit: '3', percent: 66, fill: '', hint: '1 locator slot remaining.' },
            { icon: <TbMapPin />, label: 'Locations', used: 87, limit: '500', percent: 17, fill: 'ok', hint: '413 locations remaining.' },
            { icon: <TbEye />, label: 'Widget Views', used: '4,821', limit: 'unlimited', percent: 100, fill: 'ok', hint: 'Unlimited on all plans.' },
        ],
    }
}
