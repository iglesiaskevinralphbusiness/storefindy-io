'use client';
import { useState } from 'react';
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

/*
 * Phase 1 — Lemon Squeezy-portal-driven billing.
 *
 * The page is split by data source:
 *   • Your database       → plan name, status, renewal date, usage counts
 *   • Lemon Squeezy portal → payment method, invoices, plan changes, cancellation
 *
 * So there are no inline card forms / invoice tables here — anything that touches
 * money is handed off to Lemon Squeezy via the portal button + redirect modal.
 * Lemon Squeezy is a Merchant of Record, so it also handles tax/VAT and receipts.
 *
 * SUBSCRIPTIONS is hardcoded demo data. When the database / Lemon Squeezy is wired
 * up, replace it (and the initial `useState`) with the real customer record; the
 * whole page is driven off the `sub` object, so the UI follows automatically.
 *
 * The dev toggle in the header flips between "Free" and "Subscribed" while
 * building — delete it (and the `devToggle` block) once real data is in place.
 */
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

export default function BillingPageClient() {
    // TODO: replace with the real subscription state from the database / Lemon Squeezy.
    const [subKey, setSubKey] = useState('free');
    const [modal, setModal] = useState(null); // { plan }

    const sub = SUBSCRIPTIONS[subKey];
    const isSubscribed = sub.status !== 'free';
    const currentIndex = plans.findIndex((p) => p.name === sub.planName);
    const currentPlan = plans[currentIndex] || plans[0];

    const openModal = (plan) => setModal({ plan });
    const closeModal = () => setModal(null);
    const overlayClose = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };
    // Placeholder — in production this opens the Lemon Squeezy Customer Portal.
    const goToLemonPortal = () => {
        // window.location.href = portalUrl;
    };

    return (
        <div className={styles.billing}>
            <div className={styles.billingContent}>

                {/* TOP ACTIONS — DEV-ONLY toggle until the database is wired up */}
                <div className={styles.billingHeader}>
                    <div className={styles.devToggle}>
                        <span>Dev state:</span>
                        <button
                            type="button"
                            className={subKey === 'free' ? styles.active : ''}
                            onClick={() => setSubKey('free')}
                        >
                            Free
                        </button>
                        <button
                            type="button"
                            className={subKey === 'pro' ? styles.active : ''}
                            onClick={() => setSubKey('pro')}
                        >
                            Subscribed
                        </button>
                    </div>
                </div>

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
                            <span className={`${styles.badge} ${styles.fromDb}`}>From your DB</span>
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
                            <span className={`${styles.badge} ${styles.fromDb}`}>From your DB</span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCrown /> Current plan</span>
                            <span className={styles.billingVal}>
                                <span className={`${styles.tag} ${isSubscribed ? styles.pro : styles.free}`}>{sub.planName}</span>
                            </span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendar /> {sub.planStartedLabel}</span>
                            <span className={styles.billingVal}>{sub.planStarted}</span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendarEvent /> Next renewal</span>
                            {sub.renewal ? (
                                <span className={`${styles.billingVal} ${styles.renewal}`}>{sub.renewal}</span>
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
                        <button className={styles.btnLemonPortal} type="button" onClick={goToLemonPortal}>
                            <TbExternalLink /> Manage on Lemon Squeezy
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
                                <button className={styles.btnGoLemon} type="button" onClick={goToLemonPortal}>
                                    <TbExternalLink /> Continue to Lemon Squeezy Checkout
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
