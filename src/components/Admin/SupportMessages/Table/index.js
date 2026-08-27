'use client';
import { useState } from 'react';
import styles from './SupportMessagesTable.module.scss';
import { LuArrowUpDown, LuMail, LuEye, LuTrash2, LuChevronLeft } from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import { markSupportTicketAsRead, deleteSupportTicket } from '@/actions/admin';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
import Button from '@/components/Forms/Button';
import { toast } from 'react-toastify';

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
}

function truncateMessage(text, max = 90) {
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getSourceLabel(userId) {
    return userId === 'guest' ? 'Public contact form' : 'Dashboard support';
}

export default function SupportMessagesTable({ data = [], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [markingRead, setMarkingRead] = useState(false);
    const [deleteTicket, setDeleteTicket] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set('sort', column);
        params.set('order', sort === column && order === 'desc' ? 'asc' : 'desc');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleView = async (ticket) => {
        setSelectedTicket(ticket);

        if (ticket.status !== 'open') return;

        setMarkingRead(true);
        try {
            const result = await markSupportTicketAsRead(ticket._id);
            if (result.status === 'success') {
                setSelectedTicket({ ...ticket, status: 'read' });
                router.refresh();
            }
        } finally {
            setMarkingRead(false);
        }
    };

    const closeModal = () => {
        setSelectedTicket(null);
    };

    const handleDelete = async () => {
        if (!deleteTicket || deleting) return;

        setDeleting(true);
        try {
            const result = await deleteSupportTicket(deleteTicket._id);
            if (result.status === 'success') {
                toast.success(result.message);
                if (selectedTicket?._id === deleteTicket._id) {
                    setSelectedTicket(null);
                }
                setDeleteTicket(null);
                router.refresh();
            } else {
                toast.error(result.message || 'Could not delete this message.');
            }
        } catch {
            toast.error('Could not delete this message.');
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
                                <th onClick={() => handleSort('topic')}>
                                    Topic <LuArrowUpDown />
                                </th>
                                <th>Plan</th>
                                <th>Message</th>
                                <th onClick={() => handleSort('status')}>
                                    Status <LuArrowUpDown />
                                </th>
                                <th onClick={() => handleSort('created_at')}>
                                    Received <LuArrowUpDown />
                                </th>
                                <th className={styles.actionCol}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className={styles.emptyState}>
                                            <LuMail />
                                            <p>No support messages yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((ticket) => (
                                    <tr
                                        key={ticket._id}
                                        className={ticket.status === 'open' ? styles.unreadRow : ''}
                                    >
                                        <td className={styles.reference}>{ticket.reference || '—'}</td>
                                        <td>
                                            <div className={styles.emailCell}>
                                                <span className={styles.email}>{ticket.email || '—'}</span>
                                                <span className={styles.source}>{getSourceLabel(ticket.user_id)}</span>
                                            </div>
                                        </td>
                                        <td>{ticket.topic || '—'}</td>
                                        <td>{ticket.plan || '—'}</td>
                                        <td className={styles.messagePreview}>
                                            {truncateMessage(ticket.message)}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${ticket.status === 'open' ? styles.unread : styles.read}`}
                                            >
                                                <span className={styles.badgeDot} />
                                                {ticket.status === 'open' ? 'Unread' : 'Read'}
                                            </span>
                                        </td>
                                        <td className={styles.date}>
                                            {formatRelativeDate(ticket.created_at, 'Received')}
                                        </td>
                                        <td>
                                            <div className={styles.actionCell}>
                                                <button
                                                    type="button"
                                                    className={styles.viewBtn}
                                                    onClick={() => handleView(ticket)}
                                                >
                                                    <LuEye /> View
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.deleteBtn}
                                                    onClick={() => setDeleteTicket(ticket)}
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
                isOpen={selectedTicket ? true : false}
                onClose={closeModal}
                title={selectedTicket ? `Message ${selectedTicket.reference}` : 'Message details'}
            >
                {selectedTicket && (
                    <>
                        <dl className={styles.detailList}>
                            <div className={styles.detailRow}>
                                <dt>Email</dt>
                                <dd>{selectedTicket.email || '—'}</dd>
                            </div>
                            <div className={styles.detailRow}>
                                <dt>Topic</dt>
                                <dd>{selectedTicket.topic || '—'}</dd>
                            </div>
                            <div className={styles.detailRow}>
                                <dt>Plan</dt>
                                <dd>{selectedTicket.plan || '—'}</dd>
                            </div>
                            <div className={styles.detailRow}>
                                <dt>Source</dt>
                                <dd>{getSourceLabel(selectedTicket.user_id)}</dd>
                            </div>
                            <div className={styles.detailRow}>
                                <dt>Status</dt>
                                <dd>
                                    <span
                                        className={`${styles.statusBadge} ${selectedTicket.status === 'open' ? styles.unread : styles.read}`}
                                    >
                                        <span className={styles.badgeDot} />
                                        {selectedTicket.status === 'open' ? 'Unread' : 'Read'}
                                    </span>
                                </dd>
                            </div>
                            <div className={styles.detailRow}>
                                <dt>Received</dt>
                                <dd>{formatRelativeDate(selectedTicket.created_at, 'Received')}</dd>
                            </div>
                            {selectedTicket.page_url && (
                                <div className={styles.detailRow}>
                                    <dt>Page URL</dt>
                                    <dd>
                                        <a
                                            href={selectedTicket.page_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={styles.pageLink}
                                        >
                                            {selectedTicket.page_url}
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>

                        <div className={styles.messageBlock}>
                            <h3>Message</h3>
                            <p>{selectedTicket.message}</p>
                        </div>

                        <div className={styles.modalActions}>
                            <Button
                                value="Close"
                                onClick={closeModal}
                                pending={markingRead}
                            />
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={deleteTicket ? true : false}
                onClose={() => setDeleteTicket(null)}
                title="Delete Message"
            >
                <p>Are you sure you want to delete this message?</p>
                {deleteTicket && (
                    <p className={styles.deleteReference}>
                        <strong>{deleteTicket.reference}</strong> — {deleteTicket.email}
                    </p>
                )}
                <ul className={styles.deleteNotes}>
                    <li>This action cannot be undone.</li>
                    <li>The message will be permanently removed from the database.</li>
                </ul>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => setDeleteTicket(null)}
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
