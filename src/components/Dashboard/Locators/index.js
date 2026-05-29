'use client';
import { useRouter } from 'next/navigation';
import styles from './Locators.module.scss';
import { LuMapPin, LuEye, LuTrash2, LuPalette, LuPlus } from "react-icons/lu";
import { PiGear } from "react-icons/pi";
import Button from '@/components/Forms/Button';

export default function Locators() {
    const router = useRouter();
    
    return (
        <ul className={styles.locators}>
            <li className={styles.locator}>
                <div className={styles.map}>

                </div>
                <div className={styles.info}>
                    <div className={styles.name}>
                        <h3>Main Store Locator</h3>
                        <p className={styles.active}>Active</p>
                    </div>
                    <div className={styles.analytics}>
                        <p><LuMapPin /> 12 locations</p>
                        <p><LuEye /> 842 views</p>
                    </div>
                    <div className={styles.actions}>
                        <div className={styles.history}>
                            Edited 2 days ago
                        </div>
                        <Button
                            value="Manage"
                            icon={<PiGear />}
                        />
                        <Button
                            value=""
                            icon={<LuTrash2 />}
                        />
                    </div>
                </div>
            </li>

            <li className={styles.create} onClick={() => {
                router.push('/dashboard/locators/create');
            }}>
                <div className={styles.createIcon}><LuPlus /></div>
                <h3>Create a new locator</h3>
                <p>Add another store locator widget</p>
            </li>
        </ul>
    );
}