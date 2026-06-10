'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LuSettings, LuArrowLeft, LuChevronDown, LuLayoutTemplate, LuSearch, LuMapPin, LuZoomIn, LuUpload, LuX, LuCheck, LuTextCursorInput, LuFilter, LuRows3, LuNavigation, LuMapPinned } from "react-icons/lu";
import styles from './SidebarCustomize.module.scss';
import Button from '@/components/Forms/Button';

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

const DEFAULT_SETTINGS = {
    height: 'large',
    background: '#ffffff',
    color: '#000000',
    fontFamily: 'system-ui, sans-serif',
    rootFontSize: 14,
    search: {
        border: 'rounded',
        color: '#185FA5',
        label: 'Search',
        textColor: '#ffffff',
    },
    pin: {
        color: '#185FA5',
        image: null,
    },
    zoom: {
        border: 'rounded',
        color: '#ffffff',
        textColor: '#1f1f1f',
    },
    searchInput: {
        border: 'rounded',
        background: '#ffffff',
        textColor: '#1f1f1f',
        placeholder: 'Enter a location',
    },
    filter: {
        border: 'rounded',
        color: '#f1f1f1',
        label: 'Filters',
        textColor: '#1f1f1f',
    },
    resultItem: {
        activeBorder: '#185FA5',
        border: '#e4e4e4',
        background: '#ffffff',
    },
    getDirections: {
        border: 'rounded',
        color: '#185FA5',
        label: 'Get Directions',
        textColor: '#ffffff',
    },
    viewLocation: {
        border: 'rounded',
        color: '#ffffff',
        label: 'View Location',
        textColor: '#185FA5',
    },
};

export default function SidebarCustomize() {
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [openSections, setOpenSections] = useState({
        main: true,
        search: false,
        searchInput: false,
        filter: false,
        pin: false,
        zoom: false,
        resultItem: false,
        getDirections: false,
        viewLocation: false,
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

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            updateGroup('pin', 'image', URL.createObjectURL(file));
        }
    };

    const handleSave = () => {
        // TODO: persist settings to the locator
        console.log('Saving locator settings', settings);
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.header}>
                <Button
                    icon={<LuSettings />}
                />
                <Button
                    value="Back"
                    onClick={() => router.back()}
                    icon={<LuArrowLeft />}
                />
                <Button
                    value="Save Changes"
                    onClick={handleSave}
                    icon={<LuCheck />}
                    iconPosition='right'
                    primary={true}
                />
            </div>

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
                        value={settings.textColor}
                        onChange={(v) => update('textColor', v)}
                    />
                    <SelectField
                        label="Font Family"
                        value={settings.fontFamily}
                        onChange={(v) => update('fontFamily', v)}
                        options={FONT_FAMILIES}
                    />
                    <NumberField
                        label="Root Font Size"
                        value={settings.rootFontSize}
                        onChange={(v) => update('rootFontSize', v)}
                        suffix="px"
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
                        value={settings.searchInput.textColor}
                        onChange={(v) => updateGroup('searchInput', 'textColor', v)}
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
                        value={settings.search.color}
                        onChange={(v) => updateGroup('search', 'color', v)}
                    />
                    <TextField
                        label="Label"
                        value={settings.search.label}
                        placeholder="Search"
                        onChange={(v) => updateGroup('search', 'label', v)}
                    />
                    <ColorField
                        label="Text Color"
                        value={settings.search.textColor}
                        onChange={(v) => updateGroup('search', 'textColor', v)}
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
                        value={settings.filter.color}
                        onChange={(v) => updateGroup('filter', 'color', v)}
                    />
                    <TextField
                        label="Label"
                        value={settings.filter.label}
                        placeholder="Filters"
                        onChange={(v) => updateGroup('filter', 'label', v)}
                    />
                    <ColorField
                        label="Text Color"
                        value={settings.filter.textColor}
                        onChange={(v) => updateGroup('filter', 'textColor', v)}
                    />
                </Section>

                <Section
                    icon={<LuMapPin />}
                    title="Map Pin"
                    isOpen={openSections.pin}
                    onToggle={() => toggleSection('pin')}
                >
                    <ColorField
                        label="Pin Color"
                        value={settings.pin.color}
                        onChange={(v) => updateGroup('pin', 'color', v)}
                    />
                    <div className={styles.field}>
                        <label>Custom Image</label>
                        {settings.pin.image ? (
                            <div className={styles.imagePreview}>
                                <img src={settings.pin.image} alt="Pin preview" />
                                <button
                                    type="button"
                                    className={styles.removeImage}
                                    onClick={() => updateGroup('pin', 'image', null)}
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
                            >
                                <LuUpload />
                                Upload Image
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            hidden
                        />
                    </div>
                </Section>

                <Section
                    icon={<LuZoomIn />}
                    title="Zoom Buttons"
                    isOpen={openSections.zoom}
                    onToggle={() => toggleSection('zoom')}
                >
                    <SelectField
                        label="Border"
                        value={settings.zoom.border}
                        onChange={(v) => updateGroup('zoom', 'border', v)}
                        options={BORDER_STYLES}
                    />
                    <ColorField
                        label="Color"
                        value={settings.zoom.color}
                        onChange={(v) => updateGroup('zoom', 'color', v)}
                    />
                    <ColorField
                        label="Text Color"
                        value={settings.zoom.textColor}
                        onChange={(v) => updateGroup('zoom', 'textColor', v)}
                    />
                </Section>
                
                <Section
                    icon={<LuRows3 />}
                    title="Result Item"
                    isOpen={openSections.resultItem}
                    onToggle={() => toggleSection('resultItem')}
                >
                    <ColorField
                        label="Active Border"
                        value={settings.resultItem.activeBorder}
                        onChange={(v) => updateGroup('resultItem', 'activeBorder', v)}
                    />
                    <ColorField
                        label="Border"
                        value={settings.resultItem.border}
                        onChange={(v) => updateGroup('resultItem', 'border', v)}
                    />
                    <ColorField
                        label="Background"
                        value={settings.resultItem.background}
                        onChange={(v) => updateGroup('resultItem', 'background', v)}
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
                        label="Color"
                        value={settings.getDirections.color}
                        onChange={(v) => updateGroup('getDirections', 'color', v)}
                    />
                    <TextField
                        label="Label"
                        value={settings.getDirections.label}
                        placeholder="Get Directions"
                        onChange={(v) => updateGroup('getDirections', 'label', v)}
                    />
                    <ColorField
                        label="Text Color"
                        value={settings.getDirections.textColor}
                        onChange={(v) => updateGroup('getDirections', 'textColor', v)}
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
                        label="Color"
                        value={settings.viewLocation.color}
                        onChange={(v) => updateGroup('viewLocation', 'color', v)}
                    />
                    <TextField
                        label="Label"
                        value={settings.viewLocation.label}
                        placeholder="View Location"
                        onChange={(v) => updateGroup('viewLocation', 'label', v)}
                    />
                    <ColorField
                        label="Text Color"
                        value={settings.viewLocation.textColor}
                        onChange={(v) => updateGroup('viewLocation', 'textColor', v)}
                    />
                </Section>
            </div>
        </div>
    );
}


function ColorField({ label, value, onChange }) {
    return (
        <div className={styles.field}>
            <label>{label}</label>
            <div className={styles.colorPicker}>
                <span className={styles.swatch} style={{ backgroundColor: value }}>
                    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
                </span>
                <input
                    type="text"
                    className={styles.hex}
                    value={value}
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
                    value={value}
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
