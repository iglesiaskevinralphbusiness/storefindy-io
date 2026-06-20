'use client';
import { useState } from 'react';
import styles from './LocationsTable.module.scss';
import Button from '@/components/Forms/Button';
import { LuPencil, LuMap, LuEye, LuEyeOff, LuTrash2, LuArrowUpDown, LuMapPinOff, LuChevronLeft, LuPlus } from 'react-icons/lu';
import Modal from '@/components/Modal';
import { postDeleteLocation, postBulkDeleteLocations, postPublishLocation, postBulkPublishLocations } from '@/actions/locations';
import { toast } from 'react-toastify';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import { useRouter, usePathname, useSearchParams } from "next/navigation";


export default function LocationsTable({ data=[], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState(new Set());
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isBulkPublishModalOpen, setIsBulkPublishModalOpen] = useState(false);
    const [publishAction, setPublishAction] = useState(null);
    const [tooltip, setTooltip] = useState(null); // { top, left, text } for action button hover tooltip

    // Anchor the tooltip centered above the hovered button (fixed-positioned so it isn't clipped by the table's overflow).
    const showTooltip = (e, text) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ top: r.top - 8, left: r.left + r.width / 2, text });
    };
    const hideTooltip = () => setTooltip(null);

    // Sort headers don't sort — they just log the clicked column for now.
    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set("sort", column);
        params.set("order", sort === column && order === "asc" ? "desc" : "asc");
        router.push(`${pathname}?${params.toString()}`);
    };

    const toggleRow = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = (e) => {
        setSelected(e.target.checked ? new Set(data.map(l => l._id)) : new Set());
    };

    const allSelected = data.length > 0 && selected.size === data.length;

    // The full data objects for the currently checked rows.
    const selectedLocations = data.filter(l => selected.has(l._id));

    // Delete
    const handleClickDelete = async (locator_id) => {
        const res = await postDeleteLocation(locator_id);
        if(res.status === 'success') {
            toast.success(res.message);
            setIsDeleteModalOpen(false);
            router.refresh();
        } else {
            toast.error(res.message);
        }
    }
    const handleBulkDelete = async () => {
        const location_ids = selectedLocations.map(l => l._id);
        setIsBulkDeleteModalOpen(location_ids);
    };
    const handleBulkDeleteContinue = async () => {
        const res = await postBulkDeleteLocations(isBulkDeleteModalOpen);
        if (res.status === 'success') {
            toast.success(res.message);
            setSelected(new Set());
            setIsBulkDeleteModalOpen(false);
            router.refresh();
        } else {
            setIsBulkDeleteModalOpen(false);
            toast.error(res.message);
        }
    }

    // Publish
    const handleClickPublish = async (location_id, action) => {
        const res = await postPublishLocation(location_id, action);
        if(res.status === 'success') {
            toast.success(res.message);
            setSelected(new Set());
            setIsPublishModalOpen(false);
            router.refresh();
        } else {
            toast.error(res.message);
        }
    }
    const handleBulkPublish = (action) => {
        const location_ids = selectedLocations.map(l => l._id);
        setIsBulkPublishModalOpen(location_ids);
        setPublishAction(action)
    };
    const handleBulkPublishContinue = async () => {
        const res = await postBulkPublishLocations(isBulkPublishModalOpen, publishAction);
        if (res.status === 'success') {
            toast.success(res.message);
            setSelected(new Set());
            setIsBulkPublishModalOpen(false);
            router.refresh();
        } else {
            toast.error(res.message);
            setIsBulkPublishModalOpen(false);
        }
    }

    return (
        <>
            {selected.size > 0 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkCount}>{selected.size} selected</span>
                    <Button value="Publish" icon={<LuEye />} onClick={() => {handleBulkPublish('publish')}} />
                    <Button value="Unpublish" icon={<LuEyeOff />} onClick={() => handleBulkPublish('unpublish')} />
                    <Button value="Delete" icon={<LuTrash2 />} onClick={handleBulkDelete} />
                </div>
            )}
            <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                    <table>
                    <thead>
                        <tr>
                            <th style={{ width: '36px', cursor: 'default' }}>
                                <input type="checkbox" className={styles.cb} checked={allSelected} onChange={toggleAll} />
                            </th>
                            <th onClick={() => handleSort('name')}>Store Name <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('address')}>Address <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('locator')}>Locator <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('published')}>Status <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('views')}>Views <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('updatedAt')}>Date Modified <LuArrowUpDown /></th>
                            <th style={{ width: '90px', cursor: 'default' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className={styles.emptyState}>
                                        <LuMapPinOff />
                                        <p>No locations found. Start by creating a new location.</p>
                                        <Button
                                            value="Add Location"
                                            icon={<LuPlus />}
                                            onClick={() => router.push('/dashboard/locations/add-location')}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ) : data.map(l => (
                            <tr key={l._id} className={selected.has(l._id) ? styles.selected : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className={styles.cb}
                                        checked={selected.has(l._id)}
                                        onChange={() => toggleRow(l._id)}
                                    />
                                </td>
                                <td><span className={styles.storeName}>{l.name}</span></td>
                                <td className={styles.address}>
                                    {l.address}
                                </td>
                                <td><span className={styles.locatorPill}>{l.locator}</span></td>
                                <td>
                                    { l.status === 'inactive' ? <span
                                        className={`${styles.badge} ${styles.inactive}`}
                                        onMouseEnter={(e) => showTooltip(e, "You've reached your limit. To enable this location, please subscribe to Pro or Business.")}
                                        onMouseLeave={hideTooltip}
                                    >
                                        <span className={styles.badgeDot}></span>
                                        Inactive
                                    </span> : <>
                                        <span className={`${styles.badge} ${l.published ? styles.published : styles.draft}`}>
                                            <span className={styles.badgeDot}></span>
                                            {l.published ? 'Published' : 'Draft'}
                                        </span>
                                        </>
                                    }
                                </td>
                                <td className={styles.views}>{l.views > 0 ? l.views.toLocaleString() : '—'}</td>
                                <td className={styles.dateModified}>{l.updatedAt ? mongooseFormatTimeAgo(l.updatedAt) : '—'}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.actBtn} ${styles.edit}`}
                                            aria-label="Edit"
                                            onMouseEnter={(e) => showTooltip(e, 'Edit')}
                                            onMouseLeave={hideTooltip}
                                            onClick={() => router.push(`/dashboard/locations/edit-location/${l._id}`)}
                                        ><LuPencil /></button>
                                        <button
                                            className={styles.actBtn}
                                            aria-label="View on map"
                                            onMouseEnter={(e) => showTooltip(e, 'View on map')}
                                            onMouseLeave={hideTooltip}
                                            onClick={() => console.log('view on map:', l.id)}
                                        ><LuMap /></button>
                                        {
                                            l.published ? <>
                                                    <button
                                                        className={styles.actBtn}
                                                        aria-label="Unpublish"
                                                        onMouseEnter={(e) => showTooltip(e, 'Unpublish')}
                                                        onMouseLeave={hideTooltip}
                                                        onClick={() => {setIsPublishModalOpen(l._id); setPublishAction('unpublish')}}
                                                    ><LuEyeOff /></button>
                                                </> : <>
                                                    <button
                                                        className={styles.actBtn}
                                                        aria-label="Publish"
                                                        onMouseEnter={(e) => showTooltip(e, 'Publish')}
                                                        onMouseLeave={hideTooltip}
                                                        onClick={() => {setIsPublishModalOpen(l._id); setPublishAction('publish')}}
                                                    ><LuEye /></button>
                                            </>
                                        }

                                        <button
                                            className={`${styles.actBtn} ${styles.danger}`}
                                            aria-label="Delete"
                                            onMouseEnter={(e) => showTooltip(e, 'Delete')}
                                            onMouseLeave={hideTooltip}
                                            onClick={() => setIsDeleteModalOpen(l._id)}
                                        ><LuTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>

            {/* Action button hover tooltip (fixed so it escapes the table's overflow clipping). */}
            {tooltip && (
                <div className={styles.actTooltip} style={{ top: tooltip.top, left: tooltip.left }}>
                    {tooltip.text}
                </div>
            )}

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen ? true : false}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Location"
            >
                <p>Are you sure you want to delete this location? This action cannot be undone.</p>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => {
                            setIsDeleteModalOpen(false);
                        }}
                    />
                    <Button
                        value="Yes, Delete"
                        primary={true}
                        icon={<LuTrash2 />}
                        onClick={() => {
                            handleClickDelete(isDeleteModalOpen);
                        }}
                    />
                </div>
            </Modal>

            {/* Bulk Delete Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen ? true : false}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Locations"
            >
                <p>Are you sure you want to delete this multiple locations? This action cannot be undone.</p>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => {
                            setIsBulkDeleteModalOpen(false);
                        }}
                    />
                    <Button
                        value="Yes, Delete All"
                        primary={true}
                        icon={<LuTrash2 />}
                        onClick={() => handleBulkDeleteContinue()}
                    />
                </div>
            </Modal>

            {/* Publish Modal */}
            <Modal
                isOpen={isPublishModalOpen ? true : false}
                onClose={() => setIsPublishModalOpen(false)}
                title={publishAction === 'publish' ? 'Publish Location' : 'Unpublish Location'}
            >
                <p>Are you sure you want to {publishAction} this location?</p>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => {
                            setIsPublishModalOpen(false);
                        }}
                    />
                    <Button
                        value="Yes, Publish"
                        primary={true}
                        icon={publishAction === 'publish' ? <LuEye /> : <LuEyeOff />}
                        onClick={() => {
                            handleClickPublish(isPublishModalOpen, publishAction);
                        }}
                    />
                </div>
            </Modal>

            {/* Bulk Publish Modal */}
            <Modal
                isOpen={isBulkPublishModalOpen ? true : false}
                onClose={() => setIsBulkPublishModalOpen(false)}
                title="Publish Locations"
            >
                <p>Are you sure you want to {publishAction === 'publish' ? 'publish' : 'unpublish'} these multiple locations? This action cannot be undone.</p>
                <div className={styles.deleteActions}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => {
                            setIsBulkPublishModalOpen(false);
                        }}
                    />
                    <Button
                        value="Yes, Publish All"
                        primary={true}
                        icon={publishAction === 'publish' ? <LuEye /> : <LuEyeOff />}
                        onClick={() => handleBulkPublishContinue()}
                    />
                </div>
            </Modal>
        </>
    );
}
