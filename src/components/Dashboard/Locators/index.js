'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Locators.module.scss';
import { LuMapPin, LuEye, LuTrash2, LuPalette, LuPlus, LuCodeXml, LuChevronLeft } from "react-icons/lu";
import { PiGear } from "react-icons/pi";
import Button from '@/components/Forms/Button';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { postDeleteLocator } from '@/actions/locator';
import { toast } from 'react-toastify';

export default function Locators({ data=[] }) {
    const router = useRouter();
    const [isManageOpen, setIsManageOpen] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleClickDelete = async (locator_id) => {
        const res = await postDeleteLocator(locator_id);
        if(res.status === 'success') {
            toast.success(res.message);
            setIsDeleteModalOpen(false);
            router.refresh();
        } else {
            toast.error(res.message);
        }
    }
    return (<>
            <ul className={styles.locators}>
                {
                    data.map((locator, index) => {
                        return <li className={styles.locator} key={'locator' + index}>
                            <div className={styles.map}>
            
                            </div>
                            <div className={styles.info}>
                                <div className={styles.name}>
                                    <h3>{ locator.name }</h3>
                                    <p className={styles.active}>Active</p>
                                </div>
                                <div className={styles.analytics}>
                                    <p><LuMapPin /> 12 locations</p>
                                    <p><LuEye /> { locator.views } views</p>
                                </div>
                                <div className={styles.actions}>
                                    <div className={styles.history}>
                                        { mongooseFormatTimeAgo(locator.updatedAt) }
                                    </div>
                                    <div className={styles.manage}>
                                        <Button
                                            value="Manage"
                                            icon={<PiGear />}
                                            onClick={() => {
                                                setIsManageOpen(locator._id);
                                            }}
                                        />
                                        { isManageOpen === locator._id && <>
                                        <div className={styles.manageBackground} onClick={() => { setIsManageOpen(null); }}></div>
                                            <ul className={styles.manageMenu}>
                                                <li><Link href={`/dashboard/locators/preview/${locator._id}`} target="_blank"><LuEye /> Preview</Link></li>
                                                <li><Link href={`/dashboard/locators/edit/${locator._id}`}><PiGear /> Edit Locator</Link></li>
                                                <li><Link href={`/dashboard/locators/customize/${locator._id}`}><LuPalette /> Customize UI</Link></li>
                                                <li><Link href={`/dashboard/locators/embed/${locator._id}`}><LuCodeXml /> Embed Code</Link></li>
                                            </ul>
                                        </> }
                                    </div>
                                    <Button
                                        value=""
                                        icon={<LuTrash2 />}
                                        onClick={() => {
                                            setIsDeleteModalOpen(locator._id);
                                        }}
                                    />
                                </div>
                            </div>
                        </li>
                    })
                }
                

                <li className={styles.create} onClick={() => {
                    router.push('/dashboard/locators/create');
                }}>
                    <div className={styles.createIcon}><LuPlus /></div>
                    <h3>Create a new locator</h3>
                    <p>Add another store locator widget</p>
                </li>
            </ul>
            <Modal
                isOpen={isDeleteModalOpen ? true : false}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Locator"
            >
                <p>Are you sure you want to delete this locator?</p>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '10px' }}>
                    <li>This action cannot be undone.</li>
                    <li>All associated locations will also be deleted.</li>
                </ul>
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
    );
}