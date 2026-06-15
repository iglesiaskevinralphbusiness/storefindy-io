'use client';
import styles from '../../Dashboard.module.scss';
import { useRouter } from 'next/navigation';
import { useState, useActionState, useEffect } from 'react';
import { postCreateLocator, postEditLocator } from '@/actions/locator';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { LuInfo, LuCheck, LuChevronLeft, LuPlus, LuPencil, LuTrash2, LuX } from "react-icons/lu";
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

export default function LocatorsCreatePage({ data=null }) {
    const router = useRouter();

    const [locatorName, setLocatorName] = useState(data?.name || '');
    const [locatorDescription, setLocatorDescription] = useState(data?.description || '');
    const [defaultLanguage, setDefaultLanguage] = useState(data?.default_language || '');
    const [defaultCountry, setDefaultCountry] = useState(data?.default_country || 'us');
    const [defaultZoomLevel, setDefaultZoomLevel] = useState(data?.default_zoom_level || '10');
    const [searchRadius, setSearchRadius] = useState(data?.search_radius || '10');
    const [maximumResultsShown, setMaximumResultsShown] = useState(data?.maximum_results_shown || '10');
    const [filterTitle, setFilterTitle] = useState('');
    const [filters, setFilters] = useState(data?.filters || []);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [showSearchBar, setShowSearchBar] = useState(data?.show_search_bar || true);
    const [detectLocation, setDetectLocation] = useState(data?.detect_location || true);
    const [showFilters, setShowFilters] = useState(data?.show_filters || true);
    const [showRadius, setShowRadius] = useState(data?.show_radius || false);
    const [showStoreList, setShowStoreList] = useState(data?.show_store_list || true);
    const [showDirections, setShowDirections] = useState(data?.show_directions || true);
    const [showStoreHours, setShowStoreHours] = useState(data?.show_store_hours || true);
    const [showPhoneNumber, setShowPhoneNumber] = useState(data?.show_phone_number || false);
    const [showEmailAddress, setShowEmailAddress] = useState(data?.show_email_address || false);
    const [showWebsiteLink, setShowWebsiteLink] = useState(data?.show_website_link || false);
    const [poweredByStorefindy, setPoweredByStorefindy] = useState(data?.powered_by_storefindy || true);

    const handleClickAddFilter = () => {
        const title = filterTitle.trim();
        if(title !== '') {
            if(filters.some(filter => filter.title === title)) {
                toast.error('Filter already exists!');
                return;
            } else {
                setFilters(prev => [...prev, title]);
                setFilterTitle('');
                setShowFilters(true);
            }
        }
    }
    const handleClickEditFilter = (index) => {
        setEditingIndex(index);
        setEditingValue(filters[index]);
    }
    const handleClickCancelEdit = () => {
        setEditingIndex(null);
        setEditingValue('');
    }
    const handleClickSaveEdit = (index) => {
        const title = editingValue.trim();
        if(title === '') {
            toast.error('Filter title cannot be empty!');
            return;
        }
        if(filters.some((filter, i) => i !== index && filter === title)) {
            toast.error('Filter already exists!');
            return;
        }
        setFilters(prev => prev.map((filter, i) => i === index ? title : filter));
        setEditingIndex(null);
        setEditingValue('');
    }
    const handleClickDeleteFilter = (index) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
        if(editingIndex === index) {
            setEditingIndex(null);
            setEditingValue('');
        }
    }
    const handleClickCreateLocator = () => {
        console.log('create locator');
    }


    // form submit handler
    const postCreateLocatorWithParams = data ? postEditLocator.bind(null, data._id, filters) : postCreateLocator.bind(null, filters);
    const [state, action, pending] = useActionState(postCreateLocatorWithParams, { status: "idle" });
    const err = (field) => state.status === "error" ? state.errors[field] : undefined;
    useEffect(() => {
        if (state.status === "idle") return;
        if (state.status === "success") {
            toast.success(data ? "Locator updated successfully" : "Locator created successfully", { description: state.message });
            router.push('/dashboard/locators');
        } else if (state.status === "error") {
            toast.warning("Some fields are not valid", { description: Object.values(state.errors)[0] });
        } else if (state.status === "fatal") {
            toast.error("Something went wrong", { description: state.message });
        }
    }, [state]);

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Create Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators <RiArrowRightLine /> Create Locator</p>
                </div>
                <div className={styles.body}>
                    <form action={action} className={styles.create}>

                        <div className={styles.block}>
                            <h2><LuInfo /> Basic Information</h2>
                            <Input
                                label="Locator Name"
                                type="text"
                                name="locator_name"
                                value={locatorName}
                                onChange={e => setLocatorName(e.target.value)}
                                placeholder="e.g. Main Store Locator"
                                maxlength={40}
                                required={true}
                                note="This is for your reference only, customers won't see this."
                                error={err("locator_name")}
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
                                        options={COUNTRIES}
                                        note="This is default map view when auto detect user location is disabled from the widget features."
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
                                <h2>Filters / Categories</h2>
                                <div className={styles.filtersInput}>
                                    <Input
                                        label="Filter Title"
                                        type="text"
                                        name="locator_name"
                                        value={filterTitle}
                                        maxlength={40}
                                        onChange={e => setFilterTitle(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleClickAddFilter(); } }}
                                        placeholder="e.g. Free Wifi, Free Parking, Wheelchair Accessible"
                                    />
                                    <Button value="Add" icon={<LuPlus />} onClick={() => handleClickAddFilter()} />
                                </div>
                                <div className={styles.filtersList}>
                                    {filters.length > 0 ? (
                                        <ul>
                                            {filters.map((filter, index) => (
                                                <li key={'filter' + index}>
                                                    {editingIndex === index ? (
                                                        <div className={styles.filtersItemEdit}>
                                                            <input
                                                                type="text"
                                                                value={editingValue}
                                                                maxLength={40}
                                                                autoFocus
                                                                onChange={e => setEditingValue(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if(e.key === 'Enter') { e.preventDefault(); handleClickSaveEdit(index); }
                                                                    if(e.key === 'Escape') { e.preventDefault(); handleClickCancelEdit(); }
                                                                }}
                                                            />
                                                            <button type="button" title="Save" onClick={() => handleClickSaveEdit(index)}><LuCheck /></button>
                                                            <button type="button" title="Cancel" onClick={() => handleClickCancelEdit()}><LuX /></button>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.filtersItem}>
                                                            <span>{filter}</span>
                                                            <div className={styles.filtersItemActions}>
                                                                <button type="button" title="Edit" onClick={() => handleClickEditFilter(index)}><LuPencil /></button>
                                                                <button type="button" title="Delete" onClick={() => handleClickDeleteFilter(index)}><LuTrash2 /></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
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
                                description="Allow users to auto-detect their location"
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
                                description="Display a combobox to select the search radius on the form"
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
                                description="Display opening hours on each store card for all locations"
                                checked={showStoreHours}
                                onChange={() => setShowStoreHours(!showStoreHours)}
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
                                type="submit"
                                name={data ? "update_locator" : "create_locator"}
                                value={data ? "Update Locator" : "Create Locator"}
                                onClick={() => handleClickCreateLocator()}
                                required={true}
                                icon={<LuCheck />}
                                iconPosition='right'
                                primary={true}
                                disabled={locatorName.trim() === '' ? true : false}
                                pending={pending}
                            />
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}