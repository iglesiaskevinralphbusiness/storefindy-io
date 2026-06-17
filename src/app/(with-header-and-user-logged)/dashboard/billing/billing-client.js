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
    TbBrandStripe,
    TbCircleCheck,
    TbCircleX,
    TbCheck,
    TbRocket,
    TbShieldLock,
    TbFileInvoice,
    TbDownload,
    TbAlertTriangle,
    TbX,
    TbLock,
    TbClock,
    TbArrowDown,
} from 'react-icons/tb';

/*
 * Subscription state.
 *
 * This is hardcoded demo data for now. When the database / Stripe is wired up,
 * replace SUBSCRIPTIONS + the initial `useState` below with the real customer
 * record (status, plan, renewal date, saved card, usage, invoices). The whole
 * page is driven off the `sub` object, so the UI will follow automatically.
 *
 * The dev toggle in the header lets you flip between "Free" and "Subscribed"
 * states while building — delete it (and the `devToggle` block) once real data
 * is in place.
 */
const SUBSCRIPTIONS = {
    free: {
        status: 'free',
        planName: 'Free',
        billingEmail: 'mystore@email.com',
        renewal: null,
        card: null,
        nextInvoice: null,
        usage: [
            { icon: <TbMap />, label: 'Locators', used: 1, limit: '1', percent: 100, fill: 'warn', hint: "You've reached the limit. Upgrade to create more locators." },
            { icon: <TbMapPin />, label: 'Locations', used: 12, limit: '25', percent: 48, fill: '', hint: '13 locations remaining on your plan.' },
            { icon: <TbEye />, label: 'Widget Views', used: '1,204', limit: 'unlimited', percent: 100, fill: 'ok', hint: 'Widget views are unlimited on all plans.' },
        ],
        invoices: [
            { id: '#INV-2026-001', date: 'Jun 1, 2026', plan: 'Free', amount: '$0.00', status: 'free' },
            { id: '#INV-2026-000', date: 'May 1, 2026', plan: 'Free', amount: '$0.00', status: 'free' },
        ],
    },
    pro: {
        status: 'active',
        planName: 'Pro',
        billingEmail: 'mystore@email.com',
        renewal: 'July 1, 2026',
        card: { brand: 'VISA', last4: '4242' },
        nextInvoice: { date: 'July 1, 2026', amount: '$10', plan: 'Pro' },
        usage: [
            { icon: <TbMap />, label: 'Locators', used: 2, limit: '3', percent: 66, fill: '', hint: '1 locator slot remaining on your plan.' },
            { icon: <TbMapPin />, label: 'Locations', used: 87, limit: '500', percent: 17, fill: 'ok', hint: '413 locations remaining on your plan.' },
            { icon: <TbEye />, label: 'Widget Views', used: '4,821', limit: 'unlimited', percent: 100, fill: 'ok', hint: 'Widget views are unlimited on all plans.' },
        ],
        invoices: [
            { id: '#INV-2026-003', date: 'Jun 1, 2026', plan: 'Pro', amount: '$10.00', status: 'paid' },
            { id: '#INV-2026-002', date: 'May 1, 2026', plan: 'Pro', amount: '$10.00', status: 'paid' },
            { id: '#INV-2026-001', date: 'Apr 1, 2026', plan: 'Pro', amount: '$10.00', status: 'paid' },
            { id: '#INV-2026-000', date: 'Mar 1, 2026', plan: 'Free', amount: '$0.00', status: 'free' },
        ],
        downgradeLoses: [
            'Locators reduced from 3 to 1 (2 will be hidden)',
            'Locations reduced from 500 to 25 (62 will be hidden)',
            'Storefindy branding will reappear on widget',
            'Analytics & insights access removed',
        ],
    },
};

export default function BillingPageClient() {
    // TODO: replace with the real subscription state from the database / Stripe.
    const [subKey, setSubKey] = useState('free');
    const [modal, setModal] = useState(null); // { type: 'upgrade'|'downgrade'|'cancel'|'card', plan? }

    const sub = SUBSCRIPTIONS[subKey];
    const isSubscribed = sub.status !== 'free';
    const currentIndex = plans.findIndex((p) => p.name === sub.planName);
    const currentPlan = plans[currentIndex] || plans[0];

    const openModal = (type, plan = null) => setModal({ type, plan });
    const closeModal = () => setModal(null);
    const overlayClose = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };

    return (
        <div className={styles.billing}>
            <div className={styles.billingContent}>

                {/* TOP ACTIONS */}
                <div className={styles.billingHeader}>
                    {/* DEV-ONLY: toggle subscription state until the database is wired up */}
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
                    <button className={styles.manageBtn} type="button">
                        <TbBrandStripe /> Manage on Stripe
                    </button>
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
                    <div className={styles.currentPlanBar}>
                        <div className={styles.planBarIcon}><TbSparkles /></div>
                        <div className={styles.planBarInfo}>
                            <div className={styles.planBarName}>You are on the {sub.planName} plan</div>
                            <div className={styles.planBarDesc}>
                                Upgrade anytime to unlock more locators, locations, and advanced features.
                            </div>
                        </div>
                        <div className={styles.planBarRight}>
                            <div className={styles.planBarPrice}>
                                {currentPlan.price} <span>{currentPlan.period}</span>
                            </div>
                            <div className={styles.planBarRenewal}>No renewal — free forever</div>
                        </div>
                    </div>
                )}

                {/* USAGE + BILLING INFO */}
                <div className={styles.twoCol}>

                    {/* USAGE */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <TbChartBar /> Current Usage
                            <span className={`${styles.badge} ${isSubscribed ? styles.pro : styles.yellow}`}>
                                {sub.planName} plan
                            </span>
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

                    {/* BILLING INFO */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}><TbReceipt /> Billing Information</div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCrown /> Current plan</span>
                            <span className={styles.billingVal}>
                                <span className={`${styles.tag} ${isSubscribed ? styles.pro : styles.free}`}>{sub.planName}</span>
                            </span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendar /> Billing cycle</span>
                            <span className={styles.billingVal}>Monthly</span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCalendarEvent /> Next renewal</span>
                            {sub.renewal ? (
                                <span className={`${styles.billingVal} ${styles.renewal}`}>{sub.renewal}</span>
                            ) : (
                                <span className={styles.billingVal}>
                                    — <span className={styles.na}>N/A on free plan</span>
                                </span>
                            )}
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbCreditCard /> Payment method</span>
                            {sub.card ? (
                                <span className={styles.billingVal}>
                                    <span className={styles.cardChip}>
                                        <span className={styles.cardBrand}><span>{sub.card.brand}</span></span>
                                        <span className={styles.cardNum}>•••• {sub.card.last4}</span>
                                    </span>
                                    <button className={styles.editLink} type="button" onClick={() => openModal('card')}>Update</button>
                                </span>
                            ) : (
                                <span className={`${styles.billingVal} ${styles.muted}`}>No card on file</span>
                            )}
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbMail /> Billing email</span>
                            <span className={styles.billingVal}>
                                {sub.billingEmail}
                                <button className={styles.editLink} type="button">Edit</button>
                            </span>
                        </div>
                        <div className={styles.billingRow}>
                            <span className={styles.billingKey}><TbShieldCheck /> Payment gateway</span>
                            <span className={styles.billingVal}>
                                <TbBrandStripe className={styles.stripeIcon} /> Stripe
                            </span>
                        </div>
                    </div>

                </div>

                {/* PLANS & PRICING */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <TbCrown /> Plans &amp; Pricing
                        <span className={`${styles.badge} ${isSubscribed ? styles.pro : styles.yellow}`}>
                            {isSubscribed ? `On ${sub.planName}` : 'Upgrade anytime'}
                        </span>
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
                                            onClick={() => openModal('downgrade', plan)}
                                        >
                                            <TbArrowDown /> Downgrade to {plan.name}
                                        </button>
                                    ) : (
                                        <button
                                            className={`${styles.planBtn} ${styles.upgradeBtn}`}
                                            type="button"
                                            onClick={() => openModal('upgrade', plan)}
                                        >
                                            <TbRocket /> Upgrade to {plan.name}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.stripeBadge}>
                        <TbShieldLock />
                        <span>
                            Payments are securely processed by <strong>Stripe</strong>. Your card details are never stored on our servers.
                        </span>
                    </div>
                </div>

                {/* INVOICE HISTORY */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <TbFileInvoice /> Invoice History
                        <span className={`${styles.badge} ${styles.green}`}>Auto-generated by Stripe</span>
                    </div>

                    {sub.nextInvoice && (
                        <div className={styles.nextInvoice}>
                            <div>
                                <div className={styles.nextInvLabel}><TbClock /> Upcoming invoice</div>
                                <div className={styles.nextInvDate}>{sub.nextInvoice.date}</div>
                            </div>
                            <div className={styles.nextInvAmount}>
                                {sub.nextInvoice.amount} <span>/ {sub.nextInvoice.plan} plan</span>
                            </div>
                        </div>
                    )}

                    <table className={styles.invoiceTable}>
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Date</th>
                                <th>Plan</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Download</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sub.invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className={styles.invId}>{inv.id}</td>
                                    <td>{inv.date}</td>
                                    <td>{inv.plan}</td>
                                    <td className={styles.invAmount}>{inv.amount}</td>
                                    <td>
                                        <span className={`${styles.invStatus} ${styles[inv.status]}`}>
                                            {inv.status === 'free' ? 'Free' : 'Paid'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className={styles.invDl} type="button">
                                            <TbDownload /> PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isSubscribed && (
                        <div className={styles.invoiceFootnote}>
                            Invoices from paid plans will appear here automatically from Stripe.
                        </div>
                    )}
                </div>

                {/* DANGER ZONE */}
                {isSubscribed ? (
                    <div className={styles.dangerZoneCol}>
                        <div className={styles.dangerTitle}><TbAlertTriangle /> Danger zone</div>
                        <div className={styles.dangerDesc}>
                            Cancelling your {sub.planName} plan will downgrade your account to the Free plan at the end of your
                            current billing period ({sub.renewal}). Your locators and locations will not be deleted, but you&apos;ll
                            lose access to {sub.planName} features including branding removal and analytics.
                        </div>
                        <div className={styles.dangerActions}>
                            <button
                                className={styles.btnDangerOutline}
                                type="button"
                                onClick={() => openModal('downgrade', plans[0])}
                            >
                                <TbArrowDown /> Downgrade to Free
                            </button>
                            <button className={styles.btnDangerOutline} type="button" onClick={() => openModal('cancel')}>
                                <TbX /> Cancel subscription
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.dangerZone}>
                        <div className={styles.dangerInfo}>
                            <div className={styles.dangerTitle}><TbAlertTriangle /> Cancel subscription</div>
                            <div className={styles.dangerDesc}>
                                You&apos;re on the Free plan, so there&apos;s nothing to cancel. If you upgrade later, you can cancel
                                anytime and keep your data.
                            </div>
                        </div>
                        <button className={styles.btnDanger} type="button" disabled>Cancel plan</button>
                    </div>
                )}

            </div>

            {/* ───────── MODALS ───────── */}

            {/* UPGRADE MODAL */}
            {modal?.type === 'upgrade' && modal.plan && (
                <div className={styles.modalOverlay} onClick={overlayClose}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Upgrade to {modal.plan.name}</span>
                            <button className={styles.modalClose} type="button" onClick={closeModal}><TbX /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalPlanSummary}>
                                <div>
                                    <div className={styles.modalPlanName}>{modal.plan.name} Plan</div>
                                    <div className={styles.modalPlanSub}>Billed monthly · Cancel anytime</div>
                                </div>
                                <div className={styles.modalPlanPrice}>
                                    {modal.plan.price} <span>{modal.plan.period}</span>
                                </div>
                            </div>

                            {sub.card ? (
                                <>
                                    <div className={styles.savedCardNote}>
                                        <TbCreditCard /> Your saved card <strong>{sub.card.brand} •••• {sub.card.last4}</strong> will be charged {modal.plan.price} on upgrade.
                                    </div>
                                    <label className={styles.stripeFormLabel}>Update card (optional)</label>
                                    <div className={styles.stripeField}>
                                        <TbCreditCard />
                                        <span className={styles.stripeFieldText}>Use saved card {sub.card.brand} •••• {sub.card.last4}</span>
                                    </div>
                                    <div className={styles.stripeSecure}>
                                        <TbLock />
                                        <span>Secured by <strong>Stripe</strong> · 256-bit SSL</span>
                                    </div>
                                    <button className={styles.btnStripe} type="button" onClick={closeModal}>
                                        <TbRocket /> Upgrade to {modal.plan.name} — {modal.plan.price}/mo
                                    </button>
                                    <div className={styles.modalFooter}>
                                        Prorated charge applies for the current billing period.<br />
                                        Cancel anytime from billing settings.
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label className={styles.stripeFormLabel}>Card number</label>
                                    <div className={styles.stripeField}>
                                        <TbCreditCard />
                                        <span className={styles.stripeFieldText}>1234 5678 9012 3456</span>
                                        <span className={styles.stripeFieldBrand}>Visa</span>
                                    </div>
                                    <div className={styles.stripeRow}>
                                        <div>
                                            <label className={styles.stripeFormLabel}>Expiry date</label>
                                            <input className={styles.stripeInput} type="text" placeholder="MM / YY" maxLength={7} />
                                        </div>
                                        <div>
                                            <label className={styles.stripeFormLabel}>CVC</label>
                                            <input className={styles.stripeInput} type="text" placeholder="123" maxLength={4} />
                                        </div>
                                    </div>
                                    <label className={styles.stripeFormLabel}>Name on card</label>
                                    <input className={`${styles.stripeInput} ${styles.nameInput}`} type="text" placeholder="Full name" />
                                    <div className={styles.stripeSecure}>
                                        <TbLock />
                                        <span>Secured by <strong>Stripe</strong> — 256-bit SSL encryption</span>
                                    </div>
                                    <button className={styles.btnStripe} type="button" onClick={closeModal}>
                                        <TbShieldCheck />
                                        <span>Pay {modal.plan.price} {modal.plan.period}</span>
                                    </button>
                                    <div className={styles.modalFooter}>
                                        By subscribing you agree to our Terms of Service.<br />
                                        You can cancel anytime from your billing settings.
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DOWNGRADE MODAL */}
            {modal?.type === 'downgrade' && modal.plan && (
                <div className={styles.modalOverlay} onClick={overlayClose}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Downgrade to {modal.plan.name}</span>
                            <button className={styles.modalClose} type="button" onClick={closeModal}><TbX /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalWarn}>
                                <div className={styles.modalWarnTitle}>
                                    <TbAlertTriangle /> You will lose these {sub.planName} features
                                </div>
                                <div className={styles.modalWarnDesc}>
                                    Effective at end of billing period — {sub.renewal}.
                                </div>
                            </div>
                            <div className={styles.losesList}>
                                {(sub.downgradeLoses || []).map((loss, i) => (
                                    <div className={styles.losesItem} key={i}><TbCircleX /> {loss}</div>
                                ))}
                            </div>
                            <div className={styles.modalBtns}>
                                <button className={styles.btnKeep} type="button" onClick={closeModal}>Keep {sub.planName} plan</button>
                                <button className={styles.btnConfirmDanger} type="button" onClick={closeModal}>Downgrade to {modal.plan.name}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CANCEL MODAL */}
            {modal?.type === 'cancel' && (
                <div className={styles.modalOverlay} onClick={overlayClose}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Cancel subscription</span>
                            <button className={styles.modalClose} type="button" onClick={closeModal}><TbX /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalWarn}>
                                <div className={styles.modalWarnTitle}>
                                    <TbAlertTriangle /> Are you sure you want to cancel?
                                </div>
                                <div className={styles.modalWarnDesc}>
                                    Your {sub.planName} plan will remain active until {sub.renewal}.
                                </div>
                            </div>
                            <div className={styles.cancelDetail}>
                                <strong>What happens when you cancel:</strong><br />
                                • {sub.planName} features remain active until {sub.renewal}<br />
                                • On {sub.renewal}, you&apos;ll be moved to the Free plan<br />
                                • Your data (locators &amp; locations) will not be deleted<br />
                                • You can re-subscribe anytime
                            </div>
                            <div className={styles.modalBtns}>
                                <button className={styles.btnKeep} type="button" onClick={closeModal}>
                                    <TbCrown /> Keep {sub.planName}
                                </button>
                                <button className={styles.btnConfirmDanger} type="button" onClick={closeModal}>Yes, cancel subscription</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UPDATE CARD MODAL */}
            {modal?.type === 'card' && sub.card && (
                <div className={styles.modalOverlay} onClick={overlayClose}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Update payment method</span>
                            <button className={styles.modalClose} type="button" onClick={closeModal}><TbX /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.currentCardRow}>
                                <span className={styles.cardBrand}><span>{sub.card.brand}</span></span>
                                <span className={styles.currentCardNum}>{sub.card.brand} •••• {sub.card.last4}</span>
                                <span className={styles.currentCardLabel}>Current card</span>
                            </div>
                            <label className={styles.stripeFormLabel}>New card number</label>
                            <div className={styles.stripeField}>
                                <TbCreditCard />
                                <span className={styles.stripeFieldText}>Enter new card number</span>
                            </div>
                            <div className={styles.stripeRow}>
                                <div>
                                    <label className={styles.stripeFormLabel}>Expiry</label>
                                    <input className={styles.stripeInput} type="text" placeholder="MM / YY" maxLength={7} />
                                </div>
                                <div>
                                    <label className={styles.stripeFormLabel}>CVC</label>
                                    <input className={styles.stripeInput} type="text" placeholder="123" maxLength={4} />
                                </div>
                            </div>
                            <label className={styles.stripeFormLabel}>Name on card</label>
                            <input className={`${styles.stripeInput} ${styles.nameInput}`} type="text" placeholder="Full name" />
                            <div className={styles.stripeSecure}>
                                <TbLock />
                                <span>Secured by <strong>Stripe</strong></span>
                            </div>
                            <button className={styles.btnStripe} type="button" onClick={closeModal}>
                                <TbCreditCard /> Update payment method
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
