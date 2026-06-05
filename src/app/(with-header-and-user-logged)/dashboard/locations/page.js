import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import LocationsTable from '@/components/Dashboard/Locations/Table';
import { getLocations } from '@/actions/locations';
import Pagination from '@/components/Pagination';

export default async function LocationsPage({ searchParams }) {
    const { page=1, rows=10, sort='createdAt', order='asc' } = await searchParams;

    const locations = await getLocations(page, rows, sort, order);
    console.log(locations,'locations');

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
                    <Pagination page={locations.page} pages={locations.pages} />
                </div>
            </div>
        </>
    );
}