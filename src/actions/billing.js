"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';
import { reconcileUserSubscription } from '@/lib/lemonsqueezy';
import { TbMap, TbMapPin, TbWorld } from 'react-icons/tb';
import { queryBillingLimits } from '@/lib/billing-query';

export async function getBillingStatus() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // Self-healing fallback for the webhook: reconcile this user's plan with
    // Lemon Squeezy on read (throttled to once per ~10 min), so the billing page
    // is correct even when the user lands here without ?checkout=success or a
    // webhook delivery was missed. reconcileUserSubscription persists internally
    // and never throws, so a LS outage can't break the page.
    const userDoc = await UserModel.findById(session.user.id);
    if (!userDoc) {
        redirect('/sign-in');
    }
    await reconcileUserSubscription(userDoc);
    const user = userDoc.toObject();

    // Counts, caps and the demo/testing plan override all come from the shared
    // calculation, so this page and GET /api/v1/billing-status can never disagree
    // about whether a limit has been reached. See src/lib/billing-query.js.
    const limits = await queryBillingLimits(session.user.id, user);

    const {
        plan,
        user_plan,
        locator_used, locator_inactive, locator_percent,
        location_used, location_inactive, location_percent,
        sub_domain_used, sub_domain_inactive, sub_domain_percent,
    } = limits;

    return {
        id: plan.id,
        status: limits.status,
        planName: (plan.id).charAt(0).toUpperCase() + (plan.id).slice(1),
        billingEmail: user.email,
        planStarted: user.plan_started ? user.plan_started : '-',
        planStartedLabel: user_plan === 'free' ? 'Plan started' : 'Subscribed since',
        renewal: user.renewal_date ? user.renewal_date : '-',

        locator_max: plan.max_locator,
        locator_count: limits.locator_count,
        locator_is_limit_reached: limits.locator_is_limit_reached,

        location_max: plan.max_location,
        location_count: limits.location_count,
        location_is_limit_reached: limits.location_is_limit_reached,

        sub_domain_max: plan.max_sub_domain,
        sub_domain_count: limits.sub_domain_count,
        sub_domain_is_limit_reached: limits.sub_domain_is_limit_reached,

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
                hint: location_percent >= 100 ? `Limit reached${location_inactive > 0 ? ` and ${location_inactive} inactive` : ''}.` : `${plan.max_location - location_used} locators remaining.`
            },
            {
                icon: <TbWorld />,
                label: 'Sub Domain',
                used: sub_domain_used,
                limit: plan.max_sub_domain,
                percent: sub_domain_percent,
                fill: sub_domain_percent >= 100 ? 'warn' : '',
                hint: sub_domain_percent >= 100 ? `Limit reached${sub_domain_inactive > 0 ? ` and ${sub_domain_inactive} sub domains inactive` : ''}. Upgrade to ${sub_domain_inactive > 0 ? `enable them` : 'create more'}.` : `${plan.max_sub_domain - sub_domain_used} sub domains remaining.`
            },
        ],
    }

}
