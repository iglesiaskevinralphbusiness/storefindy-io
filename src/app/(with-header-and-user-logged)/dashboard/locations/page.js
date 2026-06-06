import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import LocationFilter from '@/components/Dashboard/Locations/Filter';
import LocationsTable from '@/components/Dashboard/Locations/Table';
import { getLocations } from '@/actions/locations';
import { getLocators } from '@/actions/locator';
import Pagination from '@/components/Pagination';

export default async function LocationsPage({ searchParams }) {
    const {
        page=1,
        rows=10,
        sort='createdAt',
        order='asc',
        search='',
        locators=''
    } = await searchParams;

    const locatorsData = await getLocators();
    const locationsData = await getLocations(page, rows, sort, order, search, locators);

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
                        <LocationFilter locators={locatorsData} />
                        <LocationsTable data={locationsData.items} sort={sort} order={order} />
                    </div>
                    <Pagination page={locationsData.page} pages={locationsData.pages} />
                </div>
            </div>
        </>
    );
}