'use server';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import ProfilePageClient from './profile-client';
import { getProfile } from '@/actions/profile';

export async function generateMetadata() {
    return {
        title: 'Profile | Store Findy',
        description: 'Manage your account details and personal information on Store Findy.',
    };
}

export default async function ProfilePage() {
    const profile = await getProfile();

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Profile</h1>
                    <p>Dashboard <RiArrowRightLine /> Account <RiArrowRightLine /> Profile</p>
                </div>
                <div className={styles.body}>
                    <ProfilePageClient data={profile} />
                </div>
            </div>
        </div>
    );
}
