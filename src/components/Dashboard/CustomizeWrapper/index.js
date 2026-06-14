'use client';
import styles from '@/app/(with-header-and-user-logged)/dashboard/Dashboard.module.scss';
import { useState } from 'react';
import Locator from '@/components/Locator';
import SidebarCustomize from '@/components/Dashboard/SidebarCustomize';
import { RiArrowRightLine } from 'react-icons/ri';
import { serializeForClient } from '@/utils/helpers';
import { isEqual } from 'lodash';
import { functionSaveCustomizeLocator } from '@/actions/locator';
import { toast } from 'react-toastify';

export default function CustomizeWrapper({ data }) {
    const { settings } = data;
    console.log(data)

    const [settingsDefault, setSettingsDefault] = useState({
        height: settings.height,
        background: settings.background,
        text_color: settings.text_color,
        font_family: settings.font_family,
        font_size: settings.font_size,
        searchInput: {
            border: settings.searchInput.border,
            background: settings.searchInput.background,
            text_color: settings.searchInput.text_color,
            border_color: settings.searchInput.border_color,
            placeholder: settings.searchInput.placeholder,
        },
        search: {
            border: settings.search.border,
            background: settings.search.background,
            label: settings.search.label,
            text_color: settings.search.text_color,
            icon: settings.search.icon,
        },
        filter: {
            border: settings.filter.border,
            background: settings.filter.background,
            label: settings.filter.label,
            text_color: settings.filter.text_color,
            icon: settings.filter.icon,
        },
        filterList: {
            border_color: settings.filterList.border_color,
            background: settings.filterList.background,
            text_color: settings.filterList.text_color,
            active_background: settings.filterList.active_background,
            active_text_color: settings.filterList.active_text_color,
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
            icon: settings.getDirections.icon,
        },
        viewLocation: {
            border: settings.viewLocation.border,
            background: settings.viewLocation.background,
            label: settings.viewLocation.label,
            text_color: settings.viewLocation.text_color,
            icon: settings.viewLocation.icon,
        },
        pin: {
            color: settings.pin.color,
            size: settings.pin.size,
            text_color: settings.pin.text_color,
            text_size: settings.pin.text_size,
            image: settings.pin.image,
        },
    });
    const [featuresDefault, setFeaturesDefault] = useState({
        //
        show_map_radius_indicator: data.show_map_radius_indicator,
        show_map_pin_number: data.show_map_pin_number,
        form_style: data.form_style,
        focused_zoom: data.focused_zoom,

        //
        show_search_bar: data.show_search_bar,
        detect_location: data.detect_location,
        show_filters: data.show_filters,
        show_radius: data.show_radius,
        show_store_list: data.show_store_list,
        show_directions: data.show_directions,
        show_store_hours: data.show_store_hours,
    });
    const [settingsData, setSettingsData] = useState(settingsDefault);
    const [featuresData, setFeaturesData] = useState(featuresDefault);

    const handleClickSave = () => {
        functionSaveCustomizeLocator(data._id, settingsData, featuresData).then((res) => {
            if(res.status === 'success') {
                setSettingsDefault(settingsData);
                setFeaturesDefault(featuresData);
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
        });
    };

    return<div className={styles.dashboard}>
        <SidebarCustomize
            settings={settingsData}
            setSettings={setSettingsData}
            features={featuresData}
            setFeatures={setFeaturesData}
            handleSave={handleClickSave}
            isSaveDisabled={isEqual(settingsDefault, settingsData) && isEqual(featuresDefault, featuresData)}
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
                    show_store_hours={data.show_store_hours}
                    show_directions={data.show_directions}
                    show_website_link={data.show_website_link}

                    // customize settings
                    settings={settingsData}
                    
                    // features settings
                    features={featuresData}
                />
            </div>
        </div>
    </div>
}