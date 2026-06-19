'use client';
import styles from '@/app/(with-header-and-user-logged)/dashboard/Dashboard.module.scss';
import { useState } from 'react';
import Locator from '@/components/Locator';
import SidebarCustomize from '@/components/Dashboard/SidebarCustomize';
import { RiArrowRightLine } from 'react-icons/ri';
import { isEqual } from 'lodash';
import { functionSaveCustomizeLocator } from '@/actions/locator';
import { toast } from 'react-toastify';
import { FaDesktop, FaMobileScreenButton } from "react-icons/fa6";
import { generateSettingsDefault, generateFeaturesDefault } from '@/utils/helpers';
import Link from 'next/link';
import Button from '@/components/Forms/Button';

export default function CustomizeWrapper({ data, available_countries, onPreview }) {
    const { settings } = data;

    const [viewMode, setViewMode] = useState('desktop');

    const [settingsDefault, setSettingsDefault] = useState(generateSettingsDefault(settings));
    const [featuresDefault, setFeaturesDefault] = useState(generateFeaturesDefault(data));
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

    const Inactive = () => {
        return <div className="empty">
            <p>You've reached your limit.<br />To enable this locator, please subscribe to Pro or Business.</p>
            <Link href="/dashboard/billing"><Button value="See Subscription" primary={true} /></Link>
        </div>
    };

    return<div className={`${styles.dashboard} ${styles.customizeLocator}`}>
        {
            !onPreview && (
                <SidebarCustomize
                    settings={settingsData}
                    setSettings={setSettingsData}
                    features={featuresData}
                    setFeatures={setFeaturesData}
                    handleSave={handleClickSave}
                    isSaveDisabled={isEqual(settingsDefault, settingsData) && isEqual(featuresDefault, featuresData)}
                />
            )
        }
        <div className={styles.content}>
            {
                !onPreview && (
                    <div className={styles.columnsTitle}>
                        <div className={styles.title}>
                            <h1>Customize Locator</h1>
                            <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Customize Locator</p>
                        </div>
                        <div className={styles.customizeViewButtons}>
                            <button className={viewMode === 'desktop' ? styles.active : ''} onClick={() => setViewMode('desktop')}><FaDesktop /></button>
                            <button className={viewMode === 'mobile' ? styles.active : ''} onClick={() => setViewMode('mobile')}><FaMobileScreenButton /></button>
                        </div>
                    </div>
                )
            }
            
            <div className={styles.body} style={{ padding: '0' }}>
                <div className={`${styles.locatorWrapper} ${viewMode === 'desktop' ? styles.desktop : styles.mobile}`}>
                <Locator
                    // active/Inactive
                    isInactive={data.status}
                    inactiveForm={<Inactive />}

                    // locator data
                    locator_id={data._id}
                    filters={data.filters}
                    available_countries={available_countries}

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
    </div>
}