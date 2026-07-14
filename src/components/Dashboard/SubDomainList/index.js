'use client';
import styles from './SubDomainList.module.scss';
import { useState } from 'react';
import {
    RiGlobalLine,
} from "react-icons/ri";
    import { LuCopy, LuTrash2, LuPen, LuExternalLink, LuCalendar, LuEye, LuChevronLeft } from "react-icons/lu";
import Button from "@/components/Forms/Button";
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import Modal from '@/components/Modal';
import { postDeleteSubDomain } from '@/actions/sub-domain';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function SubDomainList({ locators=[], data=[] }) {
    console.log(data);
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleClickDelete = async (subDomain_id) => {
        const res = await postDeleteSubDomain(subDomain_id);
        if(res.status === 'success') {
            toast.success(res.message);
            setIsDeleteModalOpen(false);
            router.refresh();
        } else {
            toast.error(res.message);
        }
    }

    const handleClickEdit = (subDomain_id) => {
        console.log(subDomain_id);
        router.push(`/dashboard/locators/subdomains/edit/${subDomain_id}`);
    }

    return <>
        <div className={styles.sdList}>
            {data.map((sd) => (
                <div
                    key={sd.name}
                    className={styles.sdCard}
                >
                    <div className={styles.sdCardHeader}>
                        <div className={styles.sdIcon}>
                            { sd.favicon ? <img src={sd.favicon} alt={sd.name} /> : <RiGlobalLine /> }
                        </div>
                        <div className={styles.sdInfo}>
                            <div className={styles.sdUrl}>
                                {sd.name}.storefindy.com
                                {sd.active && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                                <a href={`https://${sd.name}.storefindy.com`} target="_blank"><LuExternalLink /> Visit</a>
                            </div>
                            <div className={styles.sdMeta}>
                                
                                {sd.status === 'active' ? (
                                    <span className={styles.active}>Active</span>
                                ) : (
                                    <span className={styles.inactive}>
                                        Inactive
                                        <span className={styles.tooltip}>
                                            You&rsquo;ve reached your limit. To enable this locator, please subscribe to Pro or Business.
                                        </span>
                                    </span>
                                )}
                                <span>·</span>
                                <span><LuExternalLink /> {sd.locator}</span>
                                <span>·</span>
                                <span><LuCalendar /> { mongooseFormatTimeAgo(sd.createdAt, sd.updatedAt) }</span>
                                <span>·</span>
                                <span><LuEye /> {sd.visits} visits</span>
                            </div>
                        </div>
                        <div className={styles.sdActions}>
                            <Button
                                icon={<LuPen />}
                                value=""
                                onClick={() => handleClickEdit(sd._id)}
                            />
                            <Button
                                icon={<LuCopy />}
                                value=""
                            />
                            <Button
                                icon={<LuTrash2 />}
                                value=""
                                onClick={() => {
                                    setIsDeleteModalOpen(sd._id);
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles.sdCardBody}>
                        <div className={styles.sdLocatorAssign}>
                            <span className={styles.sdLocatorLabel}>Assigned locator:</span>
                            <input type="text" className={styles.sdLocatorInput} defaultValue={sd.locator} readOnly />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <Modal
            isOpen={isDeleteModalOpen ? true : false}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Delete Sub Domain"
        >
            <p>Are you sure you want to delete this sub domain? This action cannot be undone.</p>
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
    </>
}