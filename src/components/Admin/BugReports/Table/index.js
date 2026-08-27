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
import BugReportDetailView from '@/components/BugReport/DetailView';
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
                <BugReportDetailView
                    bug={selectedBug}
                    showUserId={true}
                    footer={selectedBug && (
                        <>
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
                        </>
                    )}
                />
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
