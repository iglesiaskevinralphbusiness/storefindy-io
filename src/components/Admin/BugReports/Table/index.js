'use client';
import { useState } from 'react';
import styles from './BugReportsTable.module.scss';
import {
    LuArrowUpDown,
    LuBug,
    LuEye,
    LuTrash2,
    LuChevronLeft,
    LuCircleCheck,
    LuRotateCcw,
} from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import {
    getAdminBugReport,
    updateBugReportStatus,
    deleteBugReport,
} from '@/actions/admin';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
import Button from '@/components/Forms/Button';
import { toast } from 'react-toastify';

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
}

function truncateText(text, max = 90) {
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatLabel(value) {
    if (!value) return '—';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    return value;
}

function formatAbsoluteDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function DetailRow({ label, children }) {
    return (
        <div className={styles.detailRow}>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    );
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

export default function BugReportsTable({ data = [], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedBug, setSelectedBug] = useState(null);
    const [loadingBug, setLoadingBug] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [deleteBug, setDeleteBug] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set('sort', column);
        params.set('order', sort === column && order === 'desc' ? 'asc' : 'desc');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleView = async (bug) => {
        setLoadingBug(true);
        try {
            const result = await getAdminBugReport(bug._id);
            if (result.status === 'success') {
                setSelectedBug(result.item);
            } else {
                toast.error(result.message || 'Could not load bug report.');
            }
        } catch {
            toast.error('Could not load bug report.');
        } finally {
            setLoadingBug(false);
        }
    };

    const closeModal = () => {
        setSelectedBug(null);
    };

    const handleStatusUpdate = async (nextStatus) => {
        if (!selectedBug || updatingStatus) return;

        setUpdatingStatus(true);
        try {
            const result = await updateBugReportStatus(selectedBug._id, nextStatus);
            if (result.status === 'success') {
                toast.success(result.message);
                setSelectedBug({ ...selectedBug, status: nextStatus });
                router.refresh();
            } else {
                toast.error(result.message || 'Could not update status.');
            }
        } catch (err) {
            toast.error(err?.message || 'Could not update status.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteBug || deleting) return;

        setDeleting(true);
        try {
            const result = await deleteBugReport(deleteBug._id);
            if (result.status === 'success') {
                toast.success(result.message);
                if (selectedBug?._id === deleteBug._id) {
                    setSelectedBug(null);
                }
                setDeleteBug(null);
                router.refresh();
            } else {
                toast.error(result.message || 'Could not delete this bug report.');
            }
        } catch {
            toast.error('Could not delete this bug report.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('reference')}>
                                    Reference <LuArrowUpDown />
                                </th>
                                <th onClick={() => handleSort('email')}>
                                    Email <LuArrowUpDown />
                                </th>
                                <th onClick={() => handleSort('subject')}>
                                    Subject <LuArrowUpDown />
                                </th>
                                <th onClick={() => handleSort('severity')}>
                                    Severity <LuArrowUpDown />
                                </th>
                                <th>Feature</th>
                                <th>Description</th>
                                <th onClick={() => handleSort('status')}>
                                    Status <LuArrowUpDown />
                                </th>
                                <th onClick={() => handleSort('created_at')}>
                                    Reported <LuArrowUpDown />
                                </th>
                                <th className={styles.actionCol}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.emptyState}>
                                            <LuBug />
                                            <p>No bug reports yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((bug) => (
                                    <tr
                                        key={bug._id}
                                        className={bug.status === 'open' ? styles.openRow : ''}
                                    >
                                        <td className={styles.reference}>{bug.reference || '—'}</td>
                                        <td className={styles.email}>{bug.email || '—'}</td>
                                        <td>{bug.subject || '—'}</td>
                                        <td>
                                            <span className={`${styles.severityBadge} ${getSeverityClass(bug.severity)}`}>
                                                {formatLabel(bug.severity)}
                                            </span>
                                        </td>
                                        <td>{bug.affected_feature || '—'}</td>
                                        <td className={styles.descriptionPreview}>
                                            {truncateText(bug.description)}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${bug.status === 'open' ? styles.open : styles.fixed}`}
                                            >
                                                <span className={styles.badgeDot} />
                                                {bug.status === 'open' ? 'Open' : 'Fixed'}
                                            </span>
                                        </td>
                                        <td className={styles.date}>
                                            {formatRelativeDate(bug.created_at, 'Reported')}
                                        </td>
                                        <td>
                                            <div className={styles.actionCell}>
                                                <button
                                                    type="button"
                                                    className={styles.viewBtn}
                                                    onClick={() => handleView(bug)}
                                                    disabled={loadingBug}
                                                >
                                                    <LuEye /> View
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.deleteBtn}
                                                    onClick={() => setDeleteBug(bug)}
                                                >
                                                    <LuTrash2 /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={selectedBug ? true : false}
                onClose={closeModal}
                title={selectedBug ? `Bug ${selectedBug.reference}` : 'Bug report details'}
                wide={true}
            >
                {selectedBug && (
                    <>
                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Overview</h3>
                            <dl className={styles.detailList}>
                                <DetailRow label="Reference">{displayValue(selectedBug.reference)}</DetailRow>
                                <DetailRow label="Status">
                                    <span
                                        className={`${styles.statusBadge} ${selectedBug.status === 'open' ? styles.open : styles.fixed}`}
                                    >
                                        <span className={styles.badgeDot} />
                                        {selectedBug.status === 'open' ? 'Open' : 'Fixed'}
                                    </span>
                                </DetailRow>
                                <DetailRow label="User ID">{displayValue(selectedBug.user_id)}</DetailRow>
                                <DetailRow label="Email">{displayValue(selectedBug.email)}</DetailRow>
                                <DetailRow label="Reported">{formatRelativeDate(selectedBug.created_at, 'Reported')}</DetailRow>
                                <DetailRow label="Updated">{formatAbsoluteDate(selectedBug.updated_at)}</DetailRow>
                            </dl>
                        </div>

                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Report details</h3>
                            <dl className={styles.detailList}>
                                <DetailRow label="Subject">{displayValue(selectedBug.subject)}</DetailRow>
                                <DetailRow label="Severity">
                                    <span className={`${styles.severityBadge} ${getSeverityClass(selectedBug.severity)}`}>
                                        {formatLabel(selectedBug.severity)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Affected feature">{displayValue(selectedBug.affected_feature)}</DetailRow>
                                <DetailRow label="Frequency">{formatLabel(selectedBug.frequency)}</DetailRow>
                            </dl>
                        </div>

                        <div className={styles.messageBlock}>
                            <h3>Description</h3>
                            <p>{displayValue(selectedBug.description)}</p>
                        </div>

                        <div className={styles.messageBlock}>
                            <h3>Expected behavior</h3>
                            <p>{displayValue(selectedBug.expected_behavior)}</p>
                        </div>

                        <div className={styles.messageBlock}>
                            <h3>Steps to reproduce</h3>
                            {selectedBug.steps?.length > 0 ? (
                                <ol className={styles.stepsList}>
                                    {selectedBug.steps.map((step, index) => (
                                        <li key={`${selectedBug._id}-step-${index}`}>{step}</li>
                                    ))}
                                </ol>
                            ) : (
                                <p className={styles.emptyField}>—</p>
                            )}
                        </div>

                        <div className={styles.messageBlock}>
                            <h3>Screenshots</h3>
                            {selectedBug.screenshots?.length > 0 ? (
                                <div className={styles.screenshotGrid}>
                                    {selectedBug.screenshots.map((src, index) => (
                                        <a
                                            key={`${selectedBug._id}-shot-${index}`}
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
                                    <dd>{displayValue(getSystemInfo(selectedBug).browser)}</dd>
                                </div>
                                <div>
                                    <dt>OS</dt>
                                    <dd>{displayValue(getSystemInfo(selectedBug).os)}</dd>
                                </div>
                                <div>
                                    <dt>Screen resolution</dt>
                                    <dd>{displayValue(getSystemInfo(selectedBug).screen_resolution)}</dd>
                                </div>
                                <div>
                                    <dt>Plan</dt>
                                    <dd>{displayValue(getSystemInfo(selectedBug).plan)}</dd>
                                </div>
                                <div>
                                    <dt>App version</dt>
                                    <dd>{displayValue(getSystemInfo(selectedBug).app_version)}</dd>
                                </div>
                                <div className={styles.userAgentRow}>
                                    <dt>User agent</dt>
                                    <dd className={styles.userAgent}>{displayValue(getSystemInfo(selectedBug).user_agent)}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={styles.modalActions}>
                            {selectedBug.status === 'open' ? (
                                <Button
                                    value="Mark as Fixed"
                                    primary={true}
                                    icon={<LuCircleCheck />}
                                    onClick={() => handleStatusUpdate('fixed')}
                                    pending={updatingStatus}
                                />
                            ) : (
                                <Button
                                    value="Reopen"
                                    icon={<LuRotateCcw />}
                                    onClick={() => handleStatusUpdate('open')}
                                    pending={updatingStatus}
                                />
                            )}
                            <Button
                                value="Close"
                                onClick={closeModal}
                                disabled={updatingStatus}
                            />
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={deleteBug ? true : false}
                onClose={() => setDeleteBug(null)}
                title="Delete Bug Report"
            >
                <p>Are you sure you want to delete this bug report?</p>
                {deleteBug && (
                    <p className={styles.deleteReference}>
                        <strong>{deleteBug.reference}</strong> — {deleteBug.subject}
                    </p>
                )}
                <ul className={styles.deleteNotes}>
                    <li>This action cannot be undone.</li>
                    <li>The bug report will be permanently removed from the database.</li>
                </ul>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => setDeleteBug(null)}
                        disabled={deleting}
                    />
                    <Button
                        value="Yes, Delete"
                        primary={true}
                        icon={<LuTrash2 />}
                        onClick={handleDelete}
                        pending={deleting}
                    />
                </div>
            </Modal>
        </>
    );
}
