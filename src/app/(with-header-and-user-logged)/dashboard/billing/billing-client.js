'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import { plans } from '@/utils/constant/pricing';
import {
    TbSparkles,
    TbChartBar,
    TbMap,
    TbMapPin,
    TbEye,
    TbReceipt,
    TbCrown,
    TbCalendar,
    TbCalendarEvent,
    TbCreditCard,
    TbMail,
    TbShieldCheck,
    TbLemon2,
    TbCircleCheck,
    TbCircleX,
    TbCheck,
    TbRocket,
    TbFileInvoice,
    TbX,
    TbArrowDown,
    TbRefresh,
    TbExternalLink,
} from 'react-icons/tb';

const SUBSCRIPTIONS = {
    free: {
        status: 'free',
        planName: 'Free',
        billingEmail: 'mystore@email.com',
        planStarted: '-',
        planStartedLabel: 'Plan started',
        renewal: null,
        usage: [
            { icon: <TbMap />, label: 'Locators', used: 1, limit: '1', percent: 100, fill: 'warn', hint: 'Limit reached. Upgrade to create more.' },
            { icon: <TbMapPin />, label: 'Locations', used: 12, limit: '25', percent: 48, fill: '', hint: '13 locations remaining.' },
            { icon: <TbEye />, label: 'Widget Views', used: '1,204', limit: 'unlimited', percent: 100, fill: 'ok', hint: 'Unlimited on all plans.' },
        ],
    },
    pro: {
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
    },
};

export default function BillingPageClient({ data }) {
    // TODO: replace with the real subscription state from the database / Lemon Squeezy.
    const [modal, setModal] = useState(null); // { plan }
    const [loading, setLoading] = useState(false); // 'portal' | 'checkout' | false
    const [syncing, setSyncing] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    // After returning from a Lemon Squeezy checkout (?checkout=success), pull the
    // subscription from Lemon Squeezy and persist it. This is the fallback for
    // the webhook so the plan updates even when LS can't reach our server (e.g.
    // staging behind a private host). On success we refresh the server data so
    // the page re-renders with the new plan, then strip the query param.
    useEffect(() => {
        if (searchParams.get('checkout') !== 'success') return;

        let cancelled = false;
        setSyncing(true);
        (async () => {
            try {
                const res = await fetch('/api/lemonsqueezy/sync', { method: 'POST' });
                const result = await res.json().catch(() => ({}));
                if (cancelled) return;

                if (res.ok && result.status === 'success') {
                    toast.success('Subscription activated', { description: 'Your plan is now up to date.' });
                    router.replace('/dashboard/billing');
                    router.refresh();
                } else if (result.status === 'pending') {
                    toast.info('Finalizing your subscription', {
                        description: 'It may take a moment to appear — refresh shortly.',
                    });
                } else {
                    throw new Error(result.message || 'Could not sync your subscription.');
                }
            } catch (err) {
                if (!cancelled) {
                    toast.error('Could not sync your subscription', { description: err.message });
                }
            } finally {
                if (!cancelled) setSyncing(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const sub = data;
    const isSubscribed = sub.status !== 'free';
    const currentIndex = plans.findIndex((p) => p.name === sub.planName);
    const currentPlan = plans[currentIndex] || plans[0];

    const openModal = (plan) => setModal({ plan });
    const closeModal = () => setModal(null);
    const overlayClose = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };

    // Open the Lemon Squeezy hosted Customer Portal — payment method, invoices,
    // plan changes and cancellation all live there. (GET /api/.../portal returns
    // a short-lived signed URL for the current user's subscription.)
    const goToLemonPortal = async () => {
        if (loading) return;
        setLoading('portal');
        try {
            const res = await fetch('/api/lemonsqueezy/portal');
            const data = await res.json();
            if (!res.ok || !data.url) {
                throw new Error(data.message || 'Could not open the billing portal.');
            }
            window.location.href = data.url;
        } catch (err) {
            toast.error('Could not open the billing portal', { description: err.message });
            setLoading(false);
        }
    };

    // Manually reconcile the account with Lemon Squeezy. Same endpoint the
    // post-checkout effect uses; force-syncs (no throttle) so the user always
    // gets a fresh pull. On success we refresh the server data to re-render.
    const syncNow = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/lemonsqueezy/sync', { method: 'POST' });
            const result = await res.json().catch(() => ({}));

            if (res.ok && result.status === 'success') {
                toast.success('Account synced', { description: 'Your plan is up to date with Lemon Squeezy.' });
                router.refresh();
            } else if (result.status === 'pending') {
                toast.info('Nothing to sync', { description: 'No subscription found on Lemon Squeezy yet.' });
            } else {
                throw new Error(result.message || 'Could not sync your account.');
            }
        } catch (err) {
            toast.error('Could not sync your account', { description: err.message });
        } finally {
            setSyncing(false);
        }
    };

    // Start a Lemon Squeezy hosted checkout for a plan and redirect to it.
    // `plan` is a row from the pricing constant; the API maps its name to a
    // Lemon Squeezy variant id and returns the checkout URL.
    const goToCheckout = async (plan) => {
        if (loading) return;
        setLoading('checkout');
        try {
            const res = await fetch('/api/lemonsqueezy/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: plan.name.toLowerCase() }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) {
                throw new Error(data.message || 'Could not start checkout.');
            }
            window.location.href = data.url;
        } catch (err) {
            toast.error('Could not start checkout', { description: err.message });
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (date === '-') return '-';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className={styles.billing}>
            <div className={styles.billingContent}>

                {syncing && (
                    <div className={styles.syncNotice}>
                        <TbRefresh /> Syncing with Lemon Squeezy…
                    </div>
                )}

                {/* CURRENT PLAN BANNER */}
                {isSubscribed ? (
                    <div className={styles.proBanner}>
                        <div className={styles.proBannerIcon}><TbCrown /></div>
                        <div className={styles.proBannerInfo}>
                            <div className={styles.proBannerName}>
                                {sub.planName} Plan <span className={styles.proPill}>Active</span>
                            </div>
                            <div className={styles.proBannerDesc}>{currentPlan.desc}</div>
                        </div>
                        <div className={styles.proBannerRight}>
                            <div className={styles.proBannerPrice}>
                                {currentPlan.price} <span>{currentPlan.period}</span>
                            </div>
                            <div className={styles.proBannerRenewal}>
                                <TbCircleCheck /> Renews {sub.renewal}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.bannerFree}>
                        <div className={styles.bannerFreeIcon}><TbSparkles /></div>
                        <div className={styles.planBarInfo}>
                            <div className={styles.bannerFreeName}>{sub.planName} Plan</div>
                            <div className={styles.bannerFreeDesc}>
                                You&apos;re on the free plan. Upgrade anytime to unlock more locators, locations, and remove branding.
                            </div>
                        </div>
                        <div className={styles.planBarRight}>
                            <div className={styles.bannerFreePrice}>
                                {currentPlan.price} <span>{currentPlan.period}</span>
                            </div>
                            <div className={styles.planBarRenewal}>No renewal — free forever</div>
                        </div>
                    </div>
                )}

                {/* USAGE + PLAN INFO */}
                <div className={styles.twoCol}>

                    {/* USAGE — from your DB */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <TbChartBar /> Current Usage
                            <span className={`${styles.badge} ${styles.fromDb}`}>Your Plan</span>
                        </div>
                        {sub.usage.map((item) => (
                            <div className={styles.usageItem} key={item.label}>
                                <div className={styles.usageHeader}>
                                    <span className={styles.usageLabel}>{item.icon} {item.label}</span>
                                    <span className={styles.usageCount}>
                                        {item.used} <span>/ {item.limit}</span>
                                    </span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={`${styles.progressFill} ${item.fill ? styles[item.fill] : ''}`}
                                        style={{ width: `${item.percent}%` }}
                                    />
                                </div>
                                <div className={styles.usageHint}>{item.hint}</div>
                            </div>
                        ))}
                    </div>

                    {/* PLAN INFO — from your DB */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <TbReceipt /> Plan Information
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCrown /> Current plan</span>
                            <span className={styles.billingVal}>
                                <span className={`${styles.tag} ${isSubscribed ? styles.pro : styles.free}`}>{sub.planName}</span>
                            </span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendar /> {sub.planStartedLabel}</span>
                            <span className={styles.billingVal}>{ formatDate(sub.planStarted) }</span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendarEvent /> Next renewal</span>
                            {sub.renewal ? (
                                <span className={`${styles.billingVal} ${styles.renewal}`}>{ formatDate(sub.renewal) }</span>
                            ) : (
                                <span className={`${styles.billingVal} ${styles.muted}`}>N/A — free plan</span>
                            )}
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCircleCheck /> Status</span>
                            <span className={styles.billingVal}>
                                <span className={`${styles.tag} ${styles.active}`}>Active</span>
                            </span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbMail /> Billing email</span>
                            <span className={`${styles.billingVal} ${styles.muted}`}>{sub.billingEmail}</span>
                        </div>

                        <div className={styles.billingRow}>
                            <button
                                type="button"
                                className={styles.manageBtn}
                                style={{ marginLeft: 'auto' }}
                                onClick={syncNow}
                                disabled={syncing}
                                title="Refresh your plan from Lemon Squeezy"
                            >
                                <TbRefresh /> {syncing ? 'Syncing…' : 'Sync'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* LEMON SQUEEZY PORTAL — the one button that handles everything money-related */}
                <div className={styles.lemonPortalBox}>
                    <div className={styles.lemonPortalIcon}><TbLemon2 /></div>
                    <div className={styles.lemonPortalInfo}>
                        <div className={styles.lemonPortalTitle}>
                            {isSubscribed ? 'Manage your subscription on Lemon Squeezy' : 'Upgrade your plan via Lemon Squeezy'}
                        </div>
                        <div className={styles.lemonPortalDesc}>
                            {isSubscribed
                                ? 'Update your payment method, download past invoices, change your plan, or cancel — all inside the Lemon Squeezy portal.'
                                : 'Securely upgrade your plan, manage payment methods, and download tax-compliant invoices — all handled by Lemon Squeezy.'}
                        </div>
                        <div className={styles.lemonPortalFeatures}>
                            {isSubscribed ? (
                                <>
                                    <span className={styles.lemonFeaturePill}><TbCreditCard /> Update payment method</span>
                                    <span className={styles.lemonFeaturePill}><TbFileInvoice /> Download invoices</span>
                                    <span className={styles.lemonFeaturePill}><TbRefresh /> Change plan</span>
                                    <span className={styles.lemonFeaturePill}><TbX /> Cancel anytime</span>
                                </>
                            ) : (
                                <>
                                    <span className={styles.lemonFeaturePill}><TbCreditCard /> Add payment method</span>
                                    <span className={styles.lemonFeaturePill}><TbFileInvoice /> Tax-compliant invoices</span>
                                    <span className={styles.lemonFeaturePill}><TbShieldCheck /> Secure checkout</span>
                                </>
                            )}
                        </div>
                    </div>
                    {isSubscribed ? (
                        <button
                            className={styles.btnLemonPortal}
                            type="button"
                            onClick={goToLemonPortal}
                            disabled={loading === 'portal'}
                        >
                            <TbExternalLink />
                            {loading === 'portal' ? 'Opening…' : 'Manage on Lemon Squeezy'}
                        </button>
                    ) : (
                        <button
                            className={styles.btnLemonPortal}
                            type="button"
                            onClick={() => openModal(plans[1] || currentPlan)}
                        >
                            <TbExternalLink /> Upgrade with Lemon Squeezy
                        </button>
                    )}
                </div>

                {/* PLANS & PRICING */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <TbCrown /> Plans &amp; Pricing
                    </div>
                    <div className={styles.plansGrid}>
                        {plans.map((plan, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isUpgrade = idx > currentIndex;
                            const isDowngrade = idx < currentIndex;

                            let cardMod = '';
                            if (isCurrent) cardMod = styles.current;
                            else if (isSubscribed && isUpgrade) cardMod = styles.upgrade;
                            else if (!isSubscribed && plan.featured) cardMod = styles.popular;

                            return (
                                <div className={`${styles.planCard} ${cardMod}`} key={plan.name}>
                                    {isCurrent && (
                                        <div className={`${styles.planBadge} ${styles.currentBadge}`}>Current plan</div>
                                    )}
                                    {!isCurrent && isSubscribed && isUpgrade && (
                                        <div className={`${styles.planBadge} ${styles.upgradeBadge}`}>Upgrade</div>
                                    )}
                                    {!isCurrent && !isSubscribed && plan.featured && (
                                        <div className={`${styles.planBadge} ${styles.popularBadge}`}>Most popular</div>
                                    )}

                                    <div className={styles.planName}>{plan.name}</div>
                                    <div className={styles.planPrice}>
                                        {plan.price} <span>{plan.period}</span>
                                    </div>
                                    <div className={styles.planDesc}>{plan.desc}</div>
                                    <div className={styles.planDivider} />
                                    <div className={styles.planFeatures}>
                                        {plan.features.map((feature, i) => (
                                            <div
                                                className={`${styles.planFeature} ${feature.ok ? styles.yes : styles.no}`}
                                                key={i}
                                            >
                                                {feature.ok ? <TbCircleCheck /> : <TbCircleX />} {feature.text}
                                            </div>
                                        ))}
                                    </div>

                                    {isCurrent ? (
                                        <button className={`${styles.planBtn} ${styles.currentBtn}`} type="button" disabled>
                                            <TbCheck /> Current plan
                                        </button>
                                    ) : isDowngrade ? (
                                        <button
                                            className={`${styles.planBtn} ${styles.downgradeBtn}`}
                                            type="button"
                                            onClick={goToLemonPortal}
                                        >
                                            <TbArrowDown /> Downgrade on Lemon Squeezy
                                        </button>
                                    ) : (
                                        <button
                                            className={`${styles.planBtn} ${styles.upgradeBtn}`}
                                            type="button"
                                            onClick={() => openModal(plan)}
                                        >
                                            <TbRocket /> Upgrade to {plan.name}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* SOURCE LEGEND */}
                    <div className={styles.sourceLegend}>
                        <span className={styles.sourceLegendTitle}>Data source:</span>
                        <div className={styles.sourceItem}>
                            <span className={`${styles.sourceDot} ${styles.dbDot}`} /> Your database — plan name, status, renewal date, usage counts
                        </div>
                        <div className={styles.sourceItem}>
                            <span className={`${styles.sourceDot} ${styles.lemonDot}`} /> Lemon Squeezy portal — payment method, invoices, cancellation
                        </div>
                    </div>
                </div>

            </div>

            {/* ───────── LEMON SQUEEZY REDIRECT MODAL ───────── */}
            {modal?.plan && (
                <div className={styles.modalOverlay} onClick={overlayClose}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Upgrade to {modal.plan.name}</span>
                            <button className={styles.modalClose} type="button" onClick={closeModal}><TbX /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalLemonRedirect}>
                                <div className={styles.lemonRedirectIcon}><TbLemon2 /></div>
                                <div className={styles.lemonRedirectTitle}>You&apos;ll be redirected to Lemon Squeezy</div>
                                <div className={styles.lemonRedirectDesc}>
                                    Lemon Squeezy securely handles your payment and any applicable tax. You&apos;ll be brought back to Storefindy once your subscription is active.
                                </div>
                                <div className={styles.lemonRedirectPlan}>
                                    <div>
                                        <div className={styles.lemonRedirectPlanName}>{modal.plan.name} Plan</div>
                                        <div className={styles.lemonRedirectPlanSub}>Billed monthly · Cancel anytime</div>
                                    </div>
                                    <div className={styles.lemonRedirectPlanPrice}>
                                        {modal.plan.price} <span>{modal.plan.period}</span>
                                    </div>
                                </div>
                                <button
                                    className={styles.btnGoLemon}
                                    type="button"
                                    onClick={() => goToCheckout(modal.plan)}
                                    disabled={loading === 'checkout'}
                                >
                                    <TbExternalLink />
                                    {loading === 'checkout' ? 'Redirecting…' : 'Continue to Lemon Squeezy Checkout'}
                                </button>
                                <div className={styles.modalCancelLink} onClick={closeModal}>
                                    Cancel — stay on {sub.planName.toLowerCase()} plan
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
