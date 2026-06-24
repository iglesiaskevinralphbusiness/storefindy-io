'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LuChevronLeft,
    LuSettings,
    LuPalette,
    LuArrowLeft,
    LuChevronDown,
    LuLayoutTemplate,
    LuSearch,
    LuMapPin,
    LuUpload,
    LuX,
    LuCheck,
    LuTextCursorInput,
    LuFilter,
    LuRows3,
    LuNavigation,
    LuMapPinned
} from "react-icons/lu";
import { MdFilterList } from "react-icons/md";
import styles from './SidebarCustomize.module.scss';
import Button from '@/components/Forms/Button';
import Checkbox from '@/components/Forms/Checkbox';
import Modal from '@/components/Modal';
import { toast } from 'react-toastify';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/svg+xml', 'image/gif', 'image/jpeg'];
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB

const HEIGHT_OPTIONS = [
    { code: 'small', label: 'Small 500px' },
    { code: 'medium', label: 'Medium 665px' },
    { code: 'large', label: 'Large 765px' },
];

const FONT_FAMILIES = [
    { code: 'system-ui, sans-serif', label: 'System Default' },
    { code: 'Arial, sans-serif', label: 'Arial' },
    { code: 'Helvetica, sans-serif', label: 'Helvetica' },
    { code: 'Georgia, serif', label: 'Georgia' },
    { code: "'Times New Roman', serif", label: 'Times New Roman' },
    { code: "'Courier New', monospace", label: 'Courier New' },
    { code: 'Roboto, sans-serif', label: 'Roboto' },
    { code: 'Poppins, sans-serif', label: 'Poppins' },
];

const BORDER_STYLES = [
    { code: 'rounded', label: 'Rounded' },
    { code: 'pill', label: 'Pill' },
    { code: 'square', label: 'Square' },
];

const SEARCH_BUTTON_ICONS = [
    { code: '', label: 'None' },
    { code: 'magnifying-glass', label: 'Magnifying Glass 1' },
    { code: 'magnifying-glass2', label: 'Magnifying Glass 2' },
    { code: 'magnifying-glass3', label: 'Magnifying Glass 3' },
    { code: 'map', label: 'Map' },
    { code: 'pin', label: 'Pin' },
    { code: 'shopping-bag', label: 'Shopping Bag' },
];

const FILTER_BUTTON_ICONS = [
    { code: '', label: 'None' },
    { code: 'funnel', label: 'Funnel' },
    { code: 'funnel-solid', label: 'Funnel Solid' },
    { code: 'list-filter', label: 'List Filter' },
    { code: 'filter-circle', label: 'Filter Circle' },
];

const GET_DIRECTIONS_VIEW_LOCATION_BUTTON_ICONS = [
    { code: '', label: 'None' },
    { code: 'map-view', label: 'Map' },
    { code: 'pin-view', label: 'Pin' },
    { code: 'pinned', label: 'Pinned' },
    { code: 'arrow-right', label: 'Arrow Right' },
    { code: 'arrow-left', label: 'Arrow Left' },
    { code: 'chevron-left', label: 'Chevron Left' },
    { code: 'chevron-right', label: 'Chevron Right' },
    { code: 'circle-chevron-left', label: 'Circle Left' },
    { code: 'circle-chevron-right', label: 'Circle Right' },
];

export default function SidebarCustomize({ user_plan, settings, setSettings, features, setFeatures, handleSave, isSaveDisabled }) {
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [isBackModalOpen, setIsBackModalOpen] = useState(false);

    // Toggles the sliding panel: false shows the tools list, true slides it out
    // to the left and brings the settings panel in from the right.
    const [showSettings, setShowSettings] = useState(false);

    const [openSections, setOpenSections] = useState({
        main: false,
        search: false,
        searchInput: false,
        filter: false,
        filterList: false,
        pin: false,
        resultItem: false,
        getDirections: false,
        viewLocation: false,
        mobileView: false,
    });

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const update = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateGroup = (group, key, value) => {
        setSettings(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
    };

    const updateFeatures = (key, value) => {
        setFeatures(prev => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Only allow PNG, SVG, GIF, and JPEG images.
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                toast.error('Invalid file type. Only PNG, SVG, GIF, and JPEG are allowed.');
                e.target.value = '';
                return;
            }
            // Limit the file size to a maximum of 500KB.
            if (file.size > MAX_IMAGE_SIZE) {
                toast.error('Image is too large. Maximum allowed size is 500KB.');
                e.target.value = '';
                return;
            }
            // Convert the image to a base64 data URL so it can be persisted
            // directly in the settings.pin.image string field.
            const reader = new FileReader();
            reader.onload = () => {
                updateGroup('pin', 'image', reader.result);
            };
            reader.readAsDataURL(file);
        }
        // Reset the input so selecting the same file again still fires onChange.
        e.target.value = '';
    };

    const handleClickBack = () => {
        if(isSaveDisabled) {
            router.back();
        } else {
            setIsBackModalOpen(true);
        }
    };

    return (
        <>
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <Button
                        icon={showSettings ? <LuPalette /> : <LuSettings />}
                        onClick={() => setShowSettings(prev => !prev)}
                    />
                    <Button
                        value="Back"
                        onClick={() => handleClickBack()}
                        icon={<LuArrowLeft />}
                    />
                    <Button
                        value="Save Changes"
                        onClick={handleSave}
                        icon={<LuCheck />}
                        iconPosition='right'
                        primary={true}
                        disabled={isSaveDisabled}
                    />
                </div>

                <div className={styles.panels}>
                    <div className={`${styles.track} ${showSettings ? styles.showSettings : ''}`}>
                        <div className={styles.tools}>
                            <Section
                                icon={<LuLayoutTemplate />}
                                title="Main"
                                isOpen={openSections.main}
                                onToggle={() => toggleSection('main')}
                            >
                                <SelectField
                                    label="Height"
                                    value={settings.height}
                                    onChange={(v) => update('height', v)}
                                    options={HEIGHT_OPTIONS}
                                />
                                <ColorField
                                    label="Background"
                                    value={settings.background}
                                    onChange={(v) => update('background', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.text_color}
                                    onChange={(v) => update('text_color', v)}
                                />
                                <SelectField
                                    label="Font Family"
                                    value={settings.font_family}
                                    onChange={(v) => update('font_family', v)}
                                    options={FONT_FAMILIES}
                                />
                                <NumberField
                                    label="Root Font Size"
                                    value={settings.font_size}
                                    onChange={(v) => update('font_size', v)}
                                    suffix="px"
                                />
                                <SelectField
                                    label="Border Wrapper"
                                    value={settings.border}
                                    onChange={(v) => update('border', v)}
                                    options={[{ code: 'none', label: 'None' }, ...BORDER_STYLES]}
                                />
                                <ColorField
                                    label="Border Color"
                                    value={settings.border_color}
                                    onChange={(v) => update('border_color', v)}
                                />
                            </Section>

                            <Section
                                icon={<LuTextCursorInput />}
                                title="Search Input"
                                isOpen={openSections.searchInput}
                                onToggle={() => toggleSection('searchInput')}
                            >
                                <SelectField
                                    label="Border"
                                    value={settings.searchInput.border}
                                    onChange={(v) => updateGroup('searchInput', 'border', v)}
                                    options={BORDER_STYLES}
                                />
                                <ColorField
                                    label="Background"
                                    value={settings.searchInput.background}
                                    onChange={(v) => updateGroup('searchInput', 'background', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.searchInput.text_color}
                                    onChange={(v) => updateGroup('searchInput', 'text_color', v)}
                                />
                                <ColorField
                                    label="Border Color"
                                    value={settings.searchInput.border_color}
                                    onChange={(v) => updateGroup('searchInput', 'border_color', v)}
                                />
                                <TextField
                                    label="Placeholder"
                                    value={settings.searchInput.placeholder}
                                    placeholder="Enter a location"
                                    onChange={(v) => updateGroup('searchInput', 'placeholder', v)}
                                />
                            </Section>

                            <Section
                                icon={<LuSearch />}
                                title="Search Button"
                                isOpen={openSections.search}
                                onToggle={() => toggleSection('search')}
                            >
                                <SelectField
                                    label="Border"
                                    value={settings.search.border}
                                    onChange={(v) => updateGroup('search', 'border', v)}
                                    options={BORDER_STYLES}
                                />
                                <ColorField
                                    label="Color"
                                    value={settings.search.background}
                                    onChange={(v) => updateGroup('search', 'background', v)}
                                />
                                <TextField
                                    label="Label"
                                    value={settings.search.label}
                                    placeholder="Search"
                                    onChange={(v) => updateGroup('search', 'label', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.search.text_color}
                                    onChange={(v) => updateGroup('search', 'text_color', v)}
                                />
                                <SelectField
                                    label="Icon"
                                    value={settings.search.icon}
                                    onChange={(v) => updateGroup('search', 'icon', v)}
                                    options={SEARCH_BUTTON_ICONS}
                                />
                            </Section>

                            <Section
                                icon={<LuFilter />}
                                title="Filter Button"
                                isOpen={openSections.filter}
                                onToggle={() => toggleSection('filter')}
                            >
                                <SelectField
                                    label="Border"
                                    value={settings.filter.border}
                                    onChange={(v) => updateGroup('filter', 'border', v)}
                                    options={BORDER_STYLES}
                                />
                                <ColorField
                                    label="Color"
                                    value={settings.filter.background}
                                    onChange={(v) => updateGroup('filter', 'background', v)}
                                />
                                <TextField
                                    label="Label"
                                    value={settings.filter.label}
                                    placeholder="Filters"
                                    onChange={(v) => updateGroup('filter', 'label', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.filter.text_color}
                                    onChange={(v) => updateGroup('filter', 'text_color', v)}
                                />
                                <SelectField
                                    label="Icon"
                                    value={settings.filter.icon}
                                    onChange={(v) => updateGroup('filter', 'icon', v)}
                                    options={FILTER_BUTTON_ICONS}
                                />
                            </Section>

                            <Section
                                icon={<MdFilterList />}
                                title="Filter List"
                                isOpen={openSections.filterList}
                                onToggle={() => toggleSection('filterList')}
                            >
                                <ColorField
                                    label="BorderColor"
                                    value={settings.filterList.border_color}
                                    onChange={(v) => updateGroup('filterList', 'border_color', v)}
                                />
                                <ColorField
                                    label="Background Color"
                                    value={settings.filterList.background}
                                    onChange={(v) => updateGroup('filterList', 'background', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.filterList.text_color}
                                    onChange={(v) => updateGroup('filterList', 'text_color', v)}
                                />
                                <ColorField
                                    label="Active Background"
                                    value={settings.filterList.active_background}
                                    onChange={(v) => updateGroup('filterList', 'active_background', v)}
                                />
                                <ColorField
                                    label="Active Text Color"
                                    value={settings.filterList.active_text_color}
                                    onChange={(v) => updateGroup('filterList', 'active_text_color', v)}
                                />
                            </Section>


                            <Section
                                icon={<LuRows3 />}
                                title="Result Items"
                                isOpen={openSections.resultItem}
                                onToggle={() => toggleSection('resultItem')}
                            >
                                <ColorField
                                    label="Background"
                                    value={settings.resultItem.background}
                                    onChange={(v) => updateGroup('resultItem', 'background', v)}
                                />
                                <SelectField
                                    label="Border"
                                    value={settings.resultItem.border}
                                    onChange={(v) => updateGroup('resultItem', 'border', v)}
                                    options={[{ code: 'none', label: 'None' }, ...BORDER_STYLES]}
                                />
                                <ColorField
                                    label="Border Color"
                                    value={settings.resultItem.border_color}
                                    onChange={(v) => updateGroup('resultItem', 'border_color', v)}
                                />
                                <ColorField
                                    label="Selected Background"
                                    value={settings.resultItem.active_background}
                                    onChange={(v) => updateGroup('resultItem', 'active_background', v)}
                                />
                                <ColorField
                                    label="Selected Border"
                                    value={settings.resultItem.active_border_color}
                                    onChange={(v) => updateGroup('resultItem', 'active_border_color', v)}
                                />

                            </Section>

                            <Section
                                icon={<LuNavigation />}
                                title="Get Directions Button"
                                isOpen={openSections.getDirections}
                                onToggle={() => toggleSection('getDirections')}
                            >
                                <SelectField
                                    label="Border"
                                    value={settings.getDirections.border}
                                    onChange={(v) => updateGroup('getDirections', 'border', v)}
                                    options={BORDER_STYLES}
                                />
                                <ColorField
                                    label="Background"
                                    value={settings.getDirections.background}
                                    onChange={(v) => updateGroup('getDirections', 'background', v)}
                                />
                                <TextField
                                    label="Label"
                                    value={settings.getDirections.label}
                                    placeholder="Get Directions"
                                    onChange={(v) => updateGroup('getDirections', 'label', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.getDirections.text_color}
                                    onChange={(v) => updateGroup('getDirections', 'text_color', v)}
                                />
                                <SelectField
                                    label="Icon"
                                    value={settings.getDirections.icon}
                                    onChange={(v) => updateGroup('getDirections', 'icon', v)}
                                    options={GET_DIRECTIONS_VIEW_LOCATION_BUTTON_ICONS}
                                />
                            </Section>

                            <Section
                                icon={<LuMapPinned />}
                                title="View Location Button"
                                isOpen={openSections.viewLocation}
                                onToggle={() => toggleSection('viewLocation')}
                            >
                                <SelectField
                                    label="Border"
                                    value={settings.viewLocation.border}
                                    onChange={(v) => updateGroup('viewLocation', 'border', v)}
                                    options={BORDER_STYLES}
                                />
                                <ColorField
                                    label="Background"
                                    value={settings.viewLocation.background}
                                    onChange={(v) => updateGroup('viewLocation', 'background', v)}
                                />
                                <TextField
                                    label="Label"
                                    value={settings.viewLocation.label}
                                    placeholder="View Location"
                                    onChange={(v) => updateGroup('viewLocation', 'label', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.viewLocation.text_color}
                                    onChange={(v) => updateGroup('viewLocation', 'text_color', v)}
                                />
                                <SelectField
                                    label="Icon"
                                    value={settings.viewLocation.icon}
                                    onChange={(v) => updateGroup('viewLocation', 'icon', v)}
                                    options={GET_DIRECTIONS_VIEW_LOCATION_BUTTON_ICONS}
                                />
                            </Section>

                            <Section
                                icon={<LuMapPin />}
                                title="Map Pin"
                                isOpen={openSections.pin}
                                onToggle={() => toggleSection('pin')}
                            >

                                <SelectField
                                    label="Size"
                                    value={settings.pin.size}
                                    onChange={(v) => updateGroup('pin', 'size', v)}
                                    options={[{code: 'small', label: 'Small'}, {code: 'medium', label: 'Medium'}, {code: 'large', label: 'Large'}]}
                                />

                                <div className={styles.mapPinContainer}>
                                   <div className={styles.fieldMap}>
                                        <input
                                            id="standard-pin"
                                            type="radio"
                                            checked={settings.pin.type === 'standard'}
                                            onChange={(v) => updateGroup('pin', 'type', 'standard')}
                                        />
                                        <label htmlFor="standard-pin">Standard Pin</label>
                                   </div>
                                   <div className={styles.fieldContainer}>
                                        <ColorField
                                            label="Pin Color"
                                            value={settings.pin.color}
                                            onChange={(v) => updateGroup('pin', 'color', v)}
                                        />
                                        <ColorField
                                            label="Text Color"
                                            value={settings.pin.text_color}
                                            onChange={(v) => updateGroup('pin', 'text_color', v)}
                                        />
                                        <NumberField
                                            label="Text Size"
                                            value={settings.pin.text_size}
                                            onChange={(v) => updateGroup('pin', 'text_size', v)}
                                            suffix="px"
                                        />
                                    </div>
                                    <div className={styles.fieldMap}>
                                        <input
                                            id="custom-pin"
                                            type="radio"
                                            checked={settings.pin.type === 'custom'}
                                            onChange={(v) => updateGroup('pin', 'type', 'custom')}
                                            disabled={user_plan === 'free'}
                                        />
                                        <label htmlFor="custom-pin" className={user_plan === 'free' ? styles.labelCustomPinDisabled : ''}>Custom Pin {user_plan === 'free' ? <span>(Pro or Business plan only)</span> : ''}</label>
                                   </div>
                                   <div className={styles.fieldContainer}>
                                        
                                   <div className={styles.field}>
                                        <label>Custom Image</label>
                                        <p className={styles.labelCustomPinImage}>Recommended: Upload a PNG or SVG · size 32×32px · Transparent background · Max 500KB</p>
                                        <p className={styles.labelCustomPinImage}>To disabled the pin number, go to customize settings (gear icon on top left besides back button)</p>
                                            {settings.pin.image ? (
                                                <div className={styles.imagePreview}>
                                                    <img src={settings.pin.image} alt="Pin preview" />
                                                    <button
                                                        type="button"
                                                        className={styles.removeImage}
                                                        onClick={() => updateGroup('pin', 'image', '')}
                                                        aria-label="Remove image"
                                                    >
                                                        <LuX />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={styles.uploadButton}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={user_plan === 'free'}
                                                >
                                                    <LuUpload />
                                                    Upload Image
                                                </button>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/png,image/svg+xml,image/gif,image/jpeg"
                                                onChange={handleImageUpload}
                                                hidden
                                            />
                                        </div>
                                   </div>
                                </div>
                            </Section>
                            <Section
                                icon={<LuMapPin />}
                                title="Mobile Tabs View"
                                isOpen={openSections.mobileView}
                                onToggle={() => toggleSection('mobileView')}
                            >
                                <p className={styles.sectionDescription}>Mobile Tabs are only visible on mobile devices</p>
                                <ColorField
                                    label="Background"
                                    value={settings.mobileView.background}
                                    onChange={(v) => updateGroup('mobileView', 'background', v)}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={settings.mobileView.text_color}
                                    onChange={(v) => updateGroup('mobileView', 'text_color', v)}
                                />
                                <ColorField
                                    label="Active Border Color"
                                    value={settings.mobileView.active_border_color}
                                    onChange={(v) => updateGroup('mobileView', 'active_border_color', v)}
                                />
                                <ColorField
                                    label="Active Background"
                                    value={settings.mobileView.active_background}
                                    onChange={(v) => updateGroup('mobileView', 'active_background', v)}
                                />
                            </Section>
                        </div>
                        <div className={styles.settings}>
                            {/* <SelectField
                                label="Form Style"
                                value={features.form_style}
                                onChange={(v) => updateFeatures('form_style', v)}
                                options={[
                                    { code: 'style-1', label: 'Style 1' },
                                    { code: 'style-2', label: 'Style 2' },
                                    { code: 'style-3', label: 'Style 3' },
                                ]}
                            /> */}
                            <Checkbox
                                label="Search bar"
                                name="show_search_box"
                                description="Let users search by city, zip, or address"
                                checked={features.show_search_bar}
                                onChange={(v) => updateFeatures('show_search_bar', v)}
                            />
                            <Checkbox
                                label="Detect my location"
                                name="detect_location"
                                description="Allow users to auto-detect their location"
                                checked={features.detect_location}
                                onChange={(v) => updateFeatures('detect_location', v)}
                            />
                            <Checkbox
                                label="Show filters"
                                name="show_filters"
                                description="Display filters on the search form"
                                checked={features.show_filters}
                                onChange={(v) => updateFeatures('show_filters', v)}
                            />
                            <Checkbox
                                label="Show combobox radius"
                                name="show_radius"
                                description="Display a combobox to select the search radius on the form"
                                checked={features.show_radius}
                                onChange={(v) => updateFeatures('show_radius', v)}
                            />
                            <Checkbox
                                label="Show radius indicator on the map"
                                name="show_map_radius_indicator"
                                description="Display a radius indicator on the map"
                                checked={features.show_map_radius_indicator}
                                onChange={(v) => updateFeatures('show_map_radius_indicator', v)}
                            />
                            <Checkbox
                                label="Show pin number on the map"
                                name="show_map_pin_number"
                                description="Display the number of pins on the map"
                                checked={features.show_map_pin_number}
                                onChange={(v) => updateFeatures('show_map_pin_number', v)}
                            />
                            <Checkbox
                                label="Zoom-in when location is selected"
                                name="focused_zoom"
                                description="Zoom in on the map when the user selects a location"
                                checked={features.focused_zoom}
                                onChange={(v) => updateFeatures('focused_zoom', v)}
                            />
                            <Checkbox
                                label="Show store list"
                                name="show_store_list"
                                description="Display a list of stores beside the map"
                                checked={features.show_store_list}
                                onChange={(v) => updateFeatures('show_store_list', v)}
                            />
                            <Checkbox
                                label="Show directions button"
                                name="show_directions"
                                description="Link to Google Maps directions for each store"
                                checked={features.show_directions}
                                onChange={(v) => updateFeatures('show_directions', v)}
                            />
                            <Checkbox
                                label="Show store hours"
                                name="show_store_hours"
                                description="Display opening hours on each store card for all locations"
                                checked={features.show_store_hours}
                                onChange={(v) => updateFeatures('show_store_hours', v)}
                            />
                            <Checkbox
                                label="Powered by Storefindy"
                                name="powered_by_storefindy"
                                description="Show branding on your widget (free plan)"
                                checked={features.powered_by_storefindy}
                                onChange={(v) => updateFeatures('powered_by_storefindy', v)}
                                disabled={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* Back Modal */}
            <Modal
                isOpen={isBackModalOpen ? true : false}
                onClose={() => setIsBackModalOpen(false)}
                title="Go Back"
            >
                <p>Are you sure you want to go back? Any unsaved changes will be lost.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                    <Button
                        value="No, Cancel"
                        icon={<LuChevronLeft />}
                        onClick={() => {
                            setIsBackModalOpen(false);
                        }}
                    />
                    <Button
                        value="Yes, Go Back"
                        primary={true}
                        icon={<LuArrowLeft />}
                        onClick={() => router.back()}
                    />
                </div>
            </Modal>
        </>

    );
}


function ColorField({ label, value, onChange }) {
    // Keep the inputs controlled even when the setting is undefined: the color
    // picker needs a valid hex, the text input is fine with an empty string.
    const hex = value ?? '';
    return (
        <div className={styles.field}>
            <label>{label}</label>
            <div className={styles.colorPicker}>
                <span className={styles.swatch} style={{ backgroundColor: hex }}>
                    <input type="color" value={hex || '#000000'} onChange={(e) => onChange(e.target.value)} />
                </span>
                <input
                    type="text"
                    className={styles.hex}
                    value={hex}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}

function SelectField({ label, value, onChange, options }) {
    return (
        <div className={styles.field}>
            <label>{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
        </div>
    );
}

function TextField({ label, value, onChange, placeholder }) {
    return (
        <div className={styles.field}>
            <label>{label}</label>
            <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

function NumberField({ label, value, onChange, suffix }) {
    return (
        <div className={styles.field}>
            <label>{label}</label>
            <div className={styles.numberInput}>
                <input
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
                {suffix && <span className={styles.suffix}>{suffix}</span>}
            </div>
        </div>
    );
}

function Section({ icon, title, isOpen, onToggle, children }) {
    return (
        <div className={`${styles.section} ${isOpen ? styles.open : ''}`}>
            <button type="button" className={styles.sectionHeader} onClick={onToggle} aria-expanded={isOpen}>
                <span className={styles.sectionTitle}>
                    {icon}
                    {title}
                </span>
                <LuChevronDown className={styles.chevron} />
            </button>
            <div className={styles.sectionBody}>
                <div className={styles.sectionContent}>
                    {children}
                </div>
            </div>
        </div>
    );
}
