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
import LimitReached from '@/components/LimitReached';

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
                        !locators || locators.length === 0 ? 
                            <LimitReached
                                msg="You don't have any locators yet. Please create a locator first."
                                href="/dashboard/locators/create"
                                buttonText={<><LuPlus /> Create Locator</>}
                            />
                        : !location ? 
                            <LimitReached
                                msg="Location not found, it could have been deleted."
                                href="/dashboard/locations"
                                buttonText={<><LuArrowLeft /> Back</>}
                            />
                        : <AddLocationClient locators={locators} data={location} />
                    }
                    
                </div>
            </div>
        </div>
    )
}