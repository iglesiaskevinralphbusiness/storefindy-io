'use client';

import { useState } from 'react';
import styles from './ProspectsTable.module.scss';
import {
    LuGlobe,
    LuTrash2,
    LuChevronLeft,
    LuCircleCheck,
    LuRotateCcw,
    LuMail,
} from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import {
    deleteProspectCustomer,
    markProspectCustomerDone,
    markProspectCustomerPending,
} from '@/actions/admin/prospectCustomerActions';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import Button from '@/components/Forms/Button';
import { toast } from 'react-toastify';

function formatRelativeDate(value) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, '').trim();
}

function getScoreClass(score) {
    if (score >= 75) return styles.scoreHigh;
    if (score >= 50) return styles.scoreMedium;
    return styles.scoreLow;
}

export default function ProspectsTable({ data = [] }) {
    const router = useRouter();
    const [deleteProspect, setDeleteProspect] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const pendingItems = data.filter((item) => item.status === 'pending');
    const doneItems = data.filter((item) => item.status === 'done');

    const handleDelete = async () => {
        if (!deleteProspect || deleting) return;

        setDeleting(true);
        try {
            const result = await deleteProspectCustomer(deleteProspect._id);
            if (result.status === 'success') {
                toast.success(result.message);
                setDeleteProspect(null);
                router.refresh();
            } else {
                toast.error(result.message || 'Could not delete this prospect.');
            }
        } catch {
            toast.error('Could not delete this prospect.');
        } finally {
            setDeleting(false);
        }
    };

    const handleStatusChange = async (prospect, nextStatus) => {
        if (updatingId) return;

        setUpdatingId(prospect._id);
        try {
            const result = nextStatus === 'done'
                ? await markProspectCustomerDone(prospect._id)
                : await markProspectCustomerPending(prospect._id);

            if (result.status === 'success') {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message || 'Could not update status.');
            }
        } catch {
            toast.error('Could not update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const renderSection = (title, items) => (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>{title}</h2>
                <span>{items.length}</span>
            </div>
            <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                    <table>
                        <thead>
                            <tr>
                                <th>Business</th>
                                <th>Website</th>
                                <th>Email</th>
                                <th>Existing locator</th>
                                <th>Locations</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Analyzed</th>
                                <th className={styles.actionCol}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.emptyState}>
                                            <LuGlobe />
                                            <p>No {title.toLowerCase()} yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((prospect) => (
                                    <tr key={prospect._id}>
                                        <td className={styles.company}>
                                            {prospect.company_name || prospect.domain || '—'}
                                        </td>
                                        <td>
                                            <a
                                                href={prospect.site_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={styles.siteLink}
                                            >
                                                {prospect.domain}
                                            </a>
                                        </td>
                                        <td>
                                            {prospect.email ? (
                                                <a href={`mailto:${prospect.email}`} className={styles.emailLink}>
                                                    <LuMail /> {prospect.email}
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td>{prospect.existing_locator || '—'}</td>
                                        <td>{prospect.estimated_location_count || (prospect.has_multiple_locations ? '2+' : '—')}</td>
                                        <td>
                                            <span className={`${styles.scoreBadge} ${getScoreClass(prospect.score)}`}>
                                                {prospect.score ?? 0}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${prospect.status === 'done' ? styles.done : styles.pending}`}>
                                                {prospect.status === 'done' ? 'Done' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className={styles.date}>
                                            {formatRelativeDate(prospect.analyzed_at || prospect.created_at)}
                                        </td>
                                        <td>
                                            <div className={styles.actionCell}>
                                                {prospect.status === 'pending' ? (
                                                    <button
                                                        type="button"
                                                        className={styles.doneBtn}
                                                        onClick={() => handleStatusChange(prospect, 'done')}
                                                        disabled={updatingId === prospect._id}
                                                    >
                                                        <LuCircleCheck /> Done
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.pendingBtn}
                                                        onClick={() => handleStatusChange(prospect, 'pending')}
                                                        disabled={updatingId === prospect._id}
                                                    >
                                                        <LuRotateCcw /> Pending
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={styles.deleteBtn}
                                                    onClick={() => setDeleteProspect(prospect)}
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
        </div>
    );

    return (
        <>
            {renderSection('Pending', pendingItems)}
            {renderSection('Done', doneItems)}

            <Modal
                isOpen={deleteProspect ? true : false}
                onClose={() => setDeleteProspect(null)}
                title="Delete Prospect"
            >
                <p>Are you sure you want to delete this prospect?</p>
                {deleteProspect && (
                    <p className={styles.deleteReference}>
                        <strong>{deleteProspect.company_name || deleteProspect.domain}</strong>
                        {deleteProspect.email ? ` — ${deleteProspect.email}` : ''}
                    </p>
                )}
                <ul className={styles.deleteNotes}>
                    <li>This action cannot be undone.</li>
                    <li>The prospect will be permanently removed from the database.</li>
                </ul>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => setDeleteProspect(null)}
                        disabled={deleting}
                    />
                    <Button
                        value="Yes, Delete"
                        primary
                        icon={<LuTrash2 />}
                        onClick={handleDelete}
                        pending={deleting}
                    />
                </div>
            </Modal>
        </>
    );
}
