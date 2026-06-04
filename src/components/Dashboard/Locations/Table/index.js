'use client';
import { useState } from 'react';
import styles from './LocationsTable.module.scss';
import Button from '@/components/Forms/Button';
import { LuPencil, LuMap, LuEye, LuEyeOff, LuTrash2, LuArrowUpDown, LuMapPinOff, LuChevronLeft, LuPlus } from 'react-icons/lu';
import Modal from '@/components/Modal';
import { postDeleteLocation, postBulkDeleteLocations } from '@/actions/locations';
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

    const handleBulkPublish = () => {
        console.log('publish:', selectedLocations);
    };
    const handleBulkUnpublish = () => {
        console.log('unpublish:', selectedLocations);
    };
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
            toast.error(res.message);
        }
    }

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

    return (
        <>
            {selected.size > 0 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkCount}>{selected.size} selected</span>
                    <Button value="Publish" icon={<LuEye />} onClick={handleBulkPublish} />
                    <Button value="Unpublish" icon={<LuEyeOff />} onClick={handleBulkUnpublish} />
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
                                            value="Create Location"
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
                                    <span className={`${styles.badge} ${l.published ? styles.published : styles.draft}`}>
                                        <span className={styles.badgeDot}></span>
                                        {l.published ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className={styles.views}>{l.views > 0 ? l.views.toLocaleString() : '—'}</td>
                                <td className={styles.dateModified}>{l.updatedAt ? mongooseFormatTimeAgo(l.updatedAt) : '—'}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.actBtn} ${styles.edit}`}
                                            title="Edit"
                                            onClick={() => router.push(`/dashboard/locations/edit-location/${l._id}`)}
                                        ><LuPencil /></button>
                                        <button
                                            className={styles.actBtn}
                                            title="View on map"
                                            onClick={() => console.log('view on map:', l.id)}
                                        ><LuMap /></button>
                                        <button
                                            className={styles.actBtn}
                                            title={l.status === 'published' ? 'Unpublish' : 'Publish'}
                                            onClick={() => console.log('toggle publish:', l.id)}
                                        >{l.status === 'published' ? <LuEyeOff /> : <LuEye />}</button>
                                        <button
                                            className={`${styles.actBtn} ${styles.danger}`}
                                            title="Delete"
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

            <Modal
                isOpen={isDeleteModalOpen ? true : false}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Locator"
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

            <Modal
                isOpen={isBulkDeleteModalOpen ? true : false}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Locator"
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
        </>
    );
}
