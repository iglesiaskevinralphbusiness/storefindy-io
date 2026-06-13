'use client';
import styles from '@/app/(with-header-and-user-logged)/dashboard/Dashboard.module.scss';
import { useState } from 'react';
import Locator from '@/components/Locator';
import SidebarCustomize from '@/components/Dashboard/SidebarCustomize';
import { RiArrowRightLine } from 'react-icons/ri';


export default function CustomizeWrapper({ data }) {
    const { settings } = data;

    const [settingsData, setSettingsData] = useState({
        height: settings.height,
        background: settings.background,
        text_color: settings.text_color,
        font_family: settings.font_family,
        font_size: settings.font_size,
        searchInput: {
            border: settings.searchInput.border,
            background: settings.searchInput.background,
            text_color: settings.searchInput.text_color,
            placeholder: settings.searchInput.placeholder,
        },
        search: {
            border: settings.search.border,
            background: settings.search.background,
            label: settings.search.label,
            text_color: settings.search.text_color,
        },
        filter: {
            border: settings.filter.border,
            background: settings.filter.background,
            label: settings.filter.label,
            text_color: settings.filter.text_color,
        },
        resultItem: {
            active_border_color: settings.resultItem.active_border_color,
            border_color: settings.resultItem.border_color,
            background: settings.resultItem.background,
        },
        getDirections: {
            border: settings.getDirections.border,
            background: settings.getDirections.background,
            label: settings.getDirections.label,
            text_color: settings.getDirections.text_color,
        },
        viewLocation: {
            border: settings.viewLocation.border,
            background: settings.viewLocation.background,
            label: settings.viewLocation.label,
            text_color: settings.viewLocation.text_color,
        },
        pin: {
            color: settings.pin.color,
            image: settings.pin.image,
        },
        zoom: {
            border: settings.zoom.border,
            background: settings.zoom.background,
            text_color: settings.zoom.text_color,
        },
    });


    return<div className={styles.dashboard}>
        <SidebarCustomize
            settings={settingsData}
            setSettings={setSettingsData}
        />
        <div className={styles.content}>
            <div className={styles.title}>
                <h1>Customize Locator</h1>
                <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Customize Locator</p>
            </div>
            <div className={styles.body} style={{ padding: '0' }}>
                <Locator
                    // locator data
                    locator_id={data._id}
                    filters={data.filters}

                    // default settings
                    search_radius={data.search_radius}
                    default_zoom_level={data.default_zoom_level}
                    detect_location={data.detect_location}
                    default_country={data.default_country}
                    show_search_bar={data.show_search_bar}
                    show_filters={data.show_filters}
                    show_radius={data.show_radius}
                    show_store_list={data.show_store_list}
                    show_phone_number={data.show_phone_number}
                    show_store_hours={data.show_store_hours}
                    show_directions={data.show_directions}
                    show_website_link={data.show_website_link}

                    // customize settings
                    settings={settingsData}
                    
                    pin_color={data.settings?.pin?.color}
                />
            </div>
        </div>
    </div>
}