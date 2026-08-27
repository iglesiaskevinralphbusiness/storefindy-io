'use client';
import styles from './BugReportDetailView.module.scss';
import { mongooseFormatTimeAgo } from '@/utils/helpers';

function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    return value;
}

function formatLabel(value) {
    if (!value) return '—';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
}

function formatAbsoluteDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function getSystemInfo(bug) {
    return bug?.system_info || {};
}

function getSeverityClass(severity) {
    if (severity === 'critical') return styles.critical;
    if (severity === 'high') return styles.high;
    if (severity === 'low') return styles.low;
    return styles.medium;
}

function DetailRow({ label, children }) {
    return (
        <div className={styles.detailRow}>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

export default function BugReportDetailView({ bug, footer = null, showUserId = false }) {
    if (!bug) return null;

    return (
        <>
            <div className={styles.modalSection}>
                <h3 className={styles.sectionTitle}>Overview</h3>
                <dl className={styles.detailList}>
                    <DetailRow label="Reference">{displayValue(bug.reference)}</DetailRow>
                    <DetailRow label="Status">
                        <span
                            className={`${styles.statusBadge} ${bug.status === 'open' ? styles.open : styles.fixed}`}
                        >
                            <span className={styles.badgeDot} />
                            {bug.status === 'open' ? 'Open' : 'Fixed'}
                        </span>
                    </DetailRow>
                    {showUserId && (
                        <DetailRow label="User ID">{displayValue(bug.user_id)}</DetailRow>
                    )}
                    <DetailRow label="Email">{displayValue(bug.email)}</DetailRow>
                    <DetailRow label="Reported">{formatRelativeDate(bug.created_at, 'Reported')}</DetailRow>
                    <DetailRow label="Updated">{formatAbsoluteDate(bug.updated_at)}</DetailRow>
                </dl>
            </div>

            <div className={styles.modalSection}>
                <h3 className={styles.sectionTitle}>Report details</h3>
                <dl className={styles.detailList}>
                    <DetailRow label="Subject">{displayValue(bug.subject)}</DetailRow>
                    <DetailRow label="Severity">
                        <span className={`${styles.severityBadge} ${getSeverityClass(bug.severity)}`}>
                            {formatLabel(bug.severity)}
                        </span>
                    </DetailRow>
                    <DetailRow label="Affected feature">{displayValue(bug.affected_feature)}</DetailRow>
                    <DetailRow label="Frequency">{formatLabel(bug.frequency)}</DetailRow>
                </dl>
            </div>

            <div className={styles.messageBlock}>
                <h3>Description</h3>
                <p>{displayValue(bug.description)}</p>
            </div>

            <div className={styles.messageBlock}>
                <h3>Expected behavior</h3>
                <p>{displayValue(bug.expected_behavior)}</p>
            </div>

            <div className={styles.messageBlock}>
                <h3>Steps to reproduce</h3>
                {bug.steps?.length > 0 ? (
                    <ol className={styles.stepsList}>
                        {bug.steps.map((step, index) => (
                            <li key={`${bug._id || bug.id}-step-${index}`}>{step}</li>
                        ))}
                    </ol>
                ) : (
                    <p className={styles.emptyField}>—</p>
                )}
            </div>

            <div className={styles.messageBlock}>
                <h3>Screenshots</h3>
                {bug.screenshots?.length > 0 ? (
                    <div className={styles.screenshotGrid}>
                        {bug.screenshots.map((src, index) => (
                            <a
                                key={`${bug._id || bug.id}-shot-${index}`}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.screenshotLink}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Screenshot ${index + 1}`} />
                            </a>
                        ))}
                    </div>
                ) : (
                    <p className={styles.emptyField}>—</p>
                )}
            </div>

            <div className={styles.messageBlock}>
                <h3>System info</h3>
                <dl className={styles.systemInfo}>
                    <div>
                        <dt>Browser</dt>
                        <dd>{displayValue(getSystemInfo(bug).browser)}</dd>
                    </div>
                    <div>
                        <dt>OS</dt>
                        <dd>{displayValue(getSystemInfo(bug).os)}</dd>
                    </div>
                    <div>
                        <dt>Screen resolution</dt>
                        <dd>{displayValue(getSystemInfo(bug).screen_resolution)}</dd>
                    </div>
                    <div>
                        <dt>Plan</dt>
                        <dd>{displayValue(getSystemInfo(bug).plan)}</dd>
                    </div>
                    <div>
                        <dt>App version</dt>
                        <dd>{displayValue(getSystemInfo(bug).app_version)}</dd>
                    </div>
                    <div className={styles.userAgentRow}>
                        <dt>User agent</dt>
                        <dd className={styles.userAgent}>{displayValue(getSystemInfo(bug).user_agent)}</dd>
                    </div>
                </dl>
            </div>

            {footer && <div className={styles.modalActions}>{footer}</div>}
        </>
    );
}
