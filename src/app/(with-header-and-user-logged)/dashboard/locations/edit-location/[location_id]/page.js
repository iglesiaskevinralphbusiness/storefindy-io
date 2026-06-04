'use server';
import styles from '../../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import AddLocationClient from '../../add-location/add-location-client';
import { getLocators } from '@/actions/locator';
import { getLocationById } from '@/actions/locations';
import Button from '@/components/Forms/Button';
import { LuPlus } from 'react-icons/lu';
import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

export default async function AddLocationPage({ params}) {
    const { location_id } = await params;
    const location = await getLocationById(location_id);
    const locators = await getLocators();

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Add Store/Location</h1>
                    <p>Dashboard <RiArrowRightLine /> Locations <RiArrowRightLine /> All Locations <RiArrowRightLine /> Edit Location</p>
                </div>
                <div className={styles.body}>
                    {
                        !locators || locators.length === 0 ? <div className="empty">
                            <p>You don't have any locators yet. Please create a locator first.</p>
                            <Link href="/dashboard/locators/create"><Button value="Create Locator" icon={<LuPlus />} primary={true} /></Link>
                        </div> : !location ? 
                            <div className="empty">
                                <p>Location not found, it could have been deleted.</p>
                                <Link href="/dashboard/locations"><Button value="Back" icon={<LuArrowLeft />} primary={true} /></Link>
                            </div> : <AddLocationClient locators={locators} data={location} />
                    }
                    
                </div>
            </div>
        </div>
    )
}