import styles from '../../../Dashboard.module.scss';
import SidebarCustomize from '@/components/Dashboard/SidebarCustomize';
import { RiArrowRightLine } from "react-icons/ri";
import { getLocatorById } from '@/actions/locator';
import { notFound } from 'next/navigation';
import Locator from '@/components/Locator';

export default async function LocatorsCustomizePage({ params }) {
    const { locator_id } = await params;
    const locator = await getLocatorById(locator_id);
    if(!locator) {
        return notFound();
    }
    

    console.log(locator);

    return (
        <div className={styles.dashboard}>
            <SidebarCustomize />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Customize Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Customize Locator</p>
                </div>
                <div className={styles.body} style={{ padding: '0' }}>
                    <Locator
                        locator_id={locator._id}
                        search_radius={locator.search_radius}
                        default_zoom_level={locator.default_zoom_level}
                        detect_location={locator.detect_location}
                        filters={locator.filters}
                        show_search_bar={locator.show_search_bar}
                        show_filters={locator.show_filters}
                        show_radius={locator.show_radius}
                        show_store_list={locator.show_store_list}
                        show_phone_number={locator.show_phone_number}
                        show_store_hours={locator.show_store_hours}
                        show_directions={locator.show_directions}
                        show_website_link={locator.show_website_link}
                        pin_color={locator.settings?.pin?.color}
                        search_input_placeholder={locator.settings?.searchInput?.placeholder}
                        search_label={locator.settings?.search?.label}
                        filter_label={locator.settings?.filter?.label}
                        get_directions_label={locator.settings?.getDirections?.label}
                        view_location_label={locator.settings?.viewLocation?.label}
                    />
                </div>
            </div>
        </div>
    );
}