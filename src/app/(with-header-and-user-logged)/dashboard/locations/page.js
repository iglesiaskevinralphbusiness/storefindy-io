import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import LocationsTable from '@/components/Dashboard/Locations/Table';
import { getLocations } from '@/actions/locations';

export default async function LocationsPage({ searchParams }) {
    const { page=1, rows=10, sort='updatedAt', order='asc' } = await searchParams;

    const locations = await getLocations(page, rows, sort, order);

    return (
        <>
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.title}>
                        <h1>All Locations</h1>
                        <p>Dashboard <RiArrowRightLine /> Locations <RiArrowRightLine /> All Locations</p>
                    </div>
                    <div className={styles.body}>
                        <LocationsTable data={locations.items} sort={sort} order={order} />
                    </div>
                </div>
            </div>
        </>
    );
}