import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { getAdminShopifyShops } from '@/actions/admin';
import Pagination from '@/components/Pagination';
import ShopifyShopsTable from '@/components/Admin/ShopifyShops/Table';

/*
 * Shops that installed the Shopify app. The sibling of /admin/users, but the
 * rows come from the Shopify app's own database (DATABASE_URL_SHOPIFY) — a
 * merchant there has no account on this site, so the *.myshopify.com domain
 * stands in for the users table's email column.
 */
export default async function AdminShopifyShopsPage({ searchParams }) {
    const {
        page = 1,
        rows = 50,
        sort = 'created_at',
        order = 'desc',
    } = await searchParams;

    const shopsData = await getAdminShopifyShops(page, rows, sort, order);

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Shopify Shops</h1>
                    <p>Admin <RiArrowRightLine /> Shopify Shops</p>
                </div>
                <div className={styles.body}>
                    <ShopifyShopsTable data={shopsData.items} sort={sort} order={order} />
                </div>
                <Pagination page={shopsData.page} pages={shopsData.pages} />
            </div>
        </div>
    );
}
