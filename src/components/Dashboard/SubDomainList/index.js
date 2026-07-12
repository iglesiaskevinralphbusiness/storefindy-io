'use client';
import styles from './SubDomainList.module.scss';
import { useState } from 'react';
import {
    RiGlobalLine,
} from "react-icons/ri";
    import { LuCopy, LuTrash2, LuSettings, LuExternalLink, LuCalendar, LuEye, LuChevronLeft } from "react-icons/lu";
import Button from "@/components/Forms/Button";
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import Modal from '@/components/Modal';
import { postDeleteSubDomain } from '@/actions/sub-domain';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function SubDomainList({ locators=[], data=[] }) {
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

    return <>
        <div className={styles.sdList}>
            {data.map((sd) => (
                <div
                    key={sd.name}
                    className={styles.sdCard}
                >
                    <div className={styles.sdCardHeader}>
                        <div className={styles.sdIcon}>
                            <RiGlobalLine />
                        </div>
                        <div className={styles.sdInfo}>
                            <div className={styles.sdUrl}>
                                {sd.name}.storefindy.com
                                {sd.active && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                                <a href={`https://${sd.name}.storefindy.com`} target="_blank"><LuExternalLink /> Visit</a>
                            </div>
                            <div className={styles.sdMeta}>
                                <span><LuExternalLink /> {sd.locator}</span>
                                <span>·</span>
                                <span><LuCalendar /> { mongooseFormatTimeAgo(sd.createdAt, sd.updatedAt) }</span>
                                <span>·</span>
                                <span><LuEye /> {sd.visits} visits</span>
                            </div>
                        </div>
                        <div className={styles.sdActions}>
                            <Button
                                icon={<LuSettings />}
                                value=""
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
                            <select className={styles.sdLocatorSelect} defaultValue={sd.locator_id}>
                                {locators.map((opt) => (
                                    <option
                                        key={opt._id}
                                        value={opt._id}
                                    >{opt.name}</option>
                                ))}
                            </select>
                        </div>
                        <Button
                            primary={true}
                            type="submit"
                            value="Save"
                            pending={false}
                        />
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