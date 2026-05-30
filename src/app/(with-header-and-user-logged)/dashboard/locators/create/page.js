'use client';
import styles from '../../Dashboard.module.scss';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { LuInfo, LuCheck, LuChevronLeft, LuPlus } from "react-icons/lu";
import { TbWorld } from "react-icons/tb";
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { PiGear } from "react-icons/pi";
import Input from '@/components/Forms/Input';
import Textarea from '@/components/Forms/Textarea';
import Select from '@/components/Forms/Select';
import Checkbox from '@/components/Forms/Checkbox';
import Button from '@/components/Forms/Button';
import { LOCALES, COUNTRIES, ZOOM_LEVELS, SEARCH_RADII, MAXIMUM_RESULTS_SHOWN } from '@/utils/constant';
import { toast } from 'react-toastify';

export default function LocatorsCreatePage() {
    const router = useRouter();
    const [locatorName, setLocatorName] = useState('');
    const [locatorDescription, setLocatorDescription] = useState('');
    const [defaultLanguage, setDefaultLanguage] = useState('');
    const [defaultCountry, setDefaultCountry] = useState('');
    const [defaultZoomLevel, setDefaultZoomLevel] = useState('10');
    const [searchRadius, setSearchRadius] = useState('10');
    const [maximumResultsShown, setMaximumResultsShown] = useState('10');
    const [filterTitle, setFilterTitle] = useState('');
    const [filters, setFilters] = useState([]);
    const [showSearchBar, setShowSearchBar] = useState(true);
    const [detectLocation, setDetectLocation] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showRadius, setShowRadius] = useState(false);
    const [showStoreList, setShowStoreList] = useState(true);
    const [showDirections, setShowDirections] = useState(true);
    const [showStoreHours, setShowStoreHours] = useState(false);
    const [showPhoneNumber, setShowPhoneNumber] = useState(false);
    const [showWebsiteLink, setShowWebsiteLink] = useState(false);
    const [poweredByStorefindy, setPoweredByStorefindy] = useState(true);

    const handleClickAddFilter = () => {
        const title = filterTitle.trim();
        if(title !== '') {
            if(filters.some(filter => filter.title === title)) {
                toast.error('Filter already exists!');
                return;
            } else {
                setFilters(prev => [...prev, { title: title }]);
                setFilterTitle('');
                setShowFilters(true);
            }
        }
    }
    const handleClickCreateLocator = () => {
        console.log('create locator');
    }

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Create Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators <RiArrowRightLine /> Create Locator</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.create}>

                        <div className={styles.block}>
                            <h2><LuInfo /> Basic Information</h2>
                            <Input
                                label="Locator Name"
                                type="text"
                                name="locator_name"
                                value={locatorName}
                                onChange={e => setLocatorName(e.target.value)}
                                placeholder="e.g. Main Store Locator"
                                required={true}
                                note="This is for your reference only, customers won't see this."
                            />
                            <Textarea
                                label="Locator Description"
                                name="locator_description"
                                value={locatorDescription}
                                onChange={e => setLocatorDescription(e.target.value)}
                                placeholder="Briefly describe what this locator is for..."
                            />
                            <Select
                                label="Default Language"
                                name="default_language"
                                value={defaultLanguage}
                                onChange={e => setDefaultLanguage(e.target.value)}
                                options={LOCALES}
                            />
                        </div>

                        <div className={styles.columns}>
                            <div>
                                <div className={styles.block}>
                                    <h2><TbWorld /> Default Map View</h2>
                                    <Select
                                        label="Default Country"
                                        name="default_country"
                                        value={defaultCountry}
                                        onChange={e => setDefaultCountry(e.target.value)}
                                        options={[{ code: '', label: 'Auto detect user location' }, ...COUNTRIES]}
                                    />
                                    <Select
                                        label="Default Zoom Level"
                                        name="default_zoom_level"
                                        value={defaultZoomLevel}
                                        onChange={e => setDefaultZoomLevel(e.target.value)}
                                        options={ZOOM_LEVELS}
                                    />
                                </div>

                                <div className={styles.block}>
                                    <h2><HiMiniMagnifyingGlass /> Search Settings</h2>
                                    <Select
                                        label="Search Radius"
                                        name="search_radius"
                                        value={searchRadius}
                                        onChange={e => setSearchRadius(e.target.value)}
                                        options={SEARCH_RADII}
                                    />
                                    <Select
                                        label="Maximum Results Shown"
                                        name="maximum_results_shown"
                                        value={maximumResultsShown}
                                        onChange={e => setMaximumResultsShown(e.target.value)}
                                        options={MAXIMUM_RESULTS_SHOWN}
                                    />
                                </div>
                            </div>
                            <div className={styles.block}>
                                <h2>Filters</h2>
                                <div className={styles.filtersInput}>
                                    <Input
                                        label="Filter Title"
                                        type="text"
                                        name="locator_name"
                                        value={filterTitle}
                                        onChange={e => setFilterTitle(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter') { handleClickAddFilter(); } }}
                                        placeholder="e.g. Free Wifi, Free Parking, Wheelchair Accessible"
                                    />
                                    <Button value="Add" icon={<LuPlus />} onClick={() => handleClickAddFilter()} />
                                </div>
                                <div className={styles.filtersList}>
                                    {filters.length > 0 ? (
                                        <ul>
                                            {filters.map((filter, index) => (
                                                <li key={index}>{filter.title}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No filters added yet</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.block}>
                            <h2><PiGear /> Widget Features</h2>
                            <Checkbox
                                label="Search bar"
                                name="show_search_box"
                                description="Let users search by city, zip, or address"
                                checked={showSearchBar}
                                onChange={() => setShowSearchBar(!showSearchBar)}
                            />
                            <Checkbox
                                label="Detect my location"
                                name="detect_location"
                                description="Show a button to auto-detect user location"
                                checked={detectLocation}
                                onChange={() => setDetectLocation(!detectLocation)}
                            />
                            <Checkbox
                                label="Show filters"
                                name="show_filters"
                                description="Display filters on the search form"
                                checked={showFilters}
                                onChange={() => setShowFilters(!showFilters)}
                            />
                            <Checkbox
                                label="Show search radius"
                                name="show_radius"
                                description="Display search radius on the search form"
                                checked={showRadius}
                                onChange={() => setShowRadius(!showRadius)}
                            />
                            <Checkbox
                                label="Show store list"
                                name="show_store_list"
                                description="Display a list of stores beside the map"
                                checked={showStoreList}
                                onChange={() => setShowStoreList(!showStoreList)}
                            />
                            <Checkbox
                                label="Show directions button"
                                name="show_directions"
                                description="Link to Google Maps directions for each store"
                                checked={showDirections}
                                onChange={() => setShowDirections(!showDirections)}
                            />
                            <Checkbox
                                label="Show store hours"
                                name="show_store_hours"
                                description="Display opening hours on each store card"
                                checked={showStoreHours}
                                onChange={() => setShowStoreHours(!showStoreHours)}
                            />
                            <Checkbox
                                label="Show phone number"
                                name="show_phone_number"
                                description="Display contact number on each store card"
                                checked={showPhoneNumber}
                                onChange={() => setShowPhoneNumber(!showPhoneNumber)}
                            />
                            <Checkbox
                                label="Show website link"
                                name="show_website_link"
                                description="Add a visit website button on each store"
                                checked={showWebsiteLink}
                                onChange={() => setShowWebsiteLink(!showWebsiteLink)}
                            />
                            <Checkbox
                                label="Powered by Storefindy"
                                name="powered_by_storefindy"
                                description="Show branding on your widget (free plan)"
                                checked={poweredByStorefindy}
                                onChange={() => setPoweredByStorefindy(!poweredByStorefindy)}
                                disabled={true}
                            />
                        </div>

                        <div className={styles.buttons}>
                            <Button
                                onClick={() => router.back()}
                                value="Back"
                                icon={<LuChevronLeft />}
                            >Back</Button>
                            <Button
                                name="create_locator"
                                value="Create Locator"
                                onClick={() => handleClickCreateLocator()}
                                required={true}
                                icon={<LuCheck />}
                                iconPosition='right'
                                primary={true}
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}