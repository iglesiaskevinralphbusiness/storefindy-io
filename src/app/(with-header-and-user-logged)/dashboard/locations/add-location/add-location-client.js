'use client';
import styles from '../../Dashboard.module.scss';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LuInfo, LuMapPin, LuHouse, LuPhone, LuClock, LuSettings, LuCheck, LuChevronLeft, LuPlus, LuRefreshCw, LuImage, LuSearch } from "react-icons/lu";
import Input from '@/components/Forms/Input';
import Textarea from '@/components/Forms/Textarea';
import Select from '@/components/Forms/Select';
import Checkbox from '@/components/Forms/Checkbox';
import Button from '@/components/Forms/Button';
import { COUNTRIES } from '@/utils/constant';
import { toast } from 'react-toastify';

// Leaflet relies on `window`, so the picker is loaded client-side only.
const MapPicker = dynamic(() => import('@/components/Dashboard/MapPicker'), {
    ssr: false,
    loading: () => null,
});

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_HOURS = {
    Mon: { enabled: true, open: '08:00', close: '17:00' },
    Tue: { enabled: true, open: '08:00', close: '17:00' },
    Wed: { enabled: true, open: '08:00', close: '17:00' },
    Thu: { enabled: true, open: '08:00', close: '17:00' },
    Fri: { enabled: true, open: '08:00', close: '17:00' },
    Sat: { enabled: true, open: '08:00', close: '17:00' },
    Sun: { enabled: false, open: '08:00', close: '17:00' },
};

const HINTS = {
    idle: '📍 Click anywhere on the map to place your pin',
    searching: '🔍 Searching...',
    placed: '✅ Pin placed! Drag to adjust.',
    notfound: '❌ Address not found. Try again.',
    error: '❌ Search failed. Try clicking the map instead.',
};

export default function AddLocationPage({ locators }) {
    const router = useRouter();

    // Basic information
    const [storeName, setStoreName] = useState('');
    const [locatorId, setLocatorId] = useState('');
    const [categories, setCategories] = useState([]);
    const [description, setDescription] = useState('');

    // Map / coordinates
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [geocode, setGeocode] = useState('');
    const [mapHint, setMapHint] = useState('idle');

    // Fallback the map starts on when geolocation is denied/unavailable.
    // Same `{ code, label }` shape as COUNTRIES so it stays consistent with the locator — change it anytime.
    const [defaultMapLocation, setDefaultMapLocation] = useState({ code: 'us', label: 'United States', lat: 40.7128, lng: -74.0060 });
    // Browser-detected position (option 1). null until granted; falls back to defaultMapLocation.
    const [userLocation, setUserLocation] = useState(null);
    const mapCenter = userLocation ?? [defaultMapLocation.lat, defaultMapLocation.lng];
    const mapZoom = userLocation ? 13 : 5;

    // Address
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postal, setPostal] = useState('');
    const [country, setCountry] = useState('ph');

    // Contact & links
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // Opening hours
    const [hours, setHours] = useState(DEFAULT_HOURS);

    // Location settings
    const [published, setPublished] = useState(true);
    const [showOpeningHours, setShowOpeningHours] = useState(true);
    const [customNotes, setCustomNotes] = useState('');

    // Locator options for the dropdown
    const [selectedLocator, setSelectedLocator] = useState(null);
    const locatorOptions = [{ code: '', label: '— Select a locator —' }, ...locators.map(locator => ({ code: locator._id, label: locator.name }))];
    

    useEffect(() => {
        const locationOption = locators.find(locator => locator._id === locatorId);
        if(locationOption) {
            setSelectedLocator(locationOption);
            console.log(locationOption)
        } else {
            setSelectedLocator(null);
        }
        setCategories([]);
    }, [locatorId]);

    // Option 1: ask the browser for the user's location to center the map on startup.
    // On deny/unavailable, mapCenter stays on defaultMapLocation.
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
            () => { /* permission denied or unavailable — keep the fallback */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
        );
    }, []);

    const toggleCategory = (category) => {
        setCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    };

    const toggleDay = (day) => {
        setHours(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));
    };

    const updateDayTime = (day, field, value) => {
        setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    };

    const handlePinChange = (newLat, newLng) => {
        setLat(String(newLat));
        setLng(String(newLng));
        setMapHint('placed');
    };

    const handleGeocode = async () => {
        const query = geocode.trim();
        if (!query) return;
        setMapHint('searching');
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
            const data = await res.json();
            if (data.length > 0) {
                handlePinChange(Number(parseFloat(data[0].lat).toFixed(6)), Number(parseFloat(data[0].lon).toFixed(6)));
                if (!street) {
                    setStreet(data[0].display_name.split(',').slice(0, 2).join(',').trim());
                }
            } else {
                setMapHint('notfound');
            }
        } catch {
            setMapHint('error');
        }
    };

    const isValid = storeName.trim() !== '' && locatorId !== '' && lat !== '' && lng !== '' && city.trim() !== '' && state.trim() !== '';

    const handleSave = () => {
        const payload = {
            name: storeName.trim(),
            locator_id: locatorId,
            categories,
            description: description.trim(),
            latitude: lat,
            longitude: lng,
            address: { street: street.trim(), city: city.trim(), state: state.trim(), postal: postal.trim(), country },
            contact: { phone: phone.trim(), email: email.trim(), website: website.trim() },
            hours,
            published,
            show_opening_hours: showOpeningHours,
            custom_notes: customNotes.trim(),
        }
        console.log(payload);
    };

    return (
        <form className={styles.create} onSubmit={e => { e.preventDefault(); handleSave(); }}>

            {/* ROW 1: Basic information + map picker */}
            <div className={styles.columns}>
                <div className={styles.block}>
                    <h2><LuInfo /> Basic Information</h2>
                    <Input
                        label="Store Name"
                        type="text"
                        name="store_name"
                        value={storeName}
                        onChange={e => setStoreName(e.target.value)}
                        placeholder="e.g. Walmart Supercenter - Manhattan"
                        required={true}
                    />
                    <Select
                        label="Locator"
                        name="locator_id"
                        value={locatorId}
                        onChange={e => setLocatorId(e.target.value)}
                        options={locatorOptions}
                        required={true}
                        note="Which locator will show this location?"
                    />
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Filters / Category <HiddenField locatorId={locatorId} show={selectedLocator?.show_filters} /></label>
                        <div className={styles.tags}>
                            {selectedLocator && selectedLocator.filters.length > 0 ? selectedLocator.filters.map(category => (
                                <span
                                    key={category}
                                    className={`${styles.tag} ${categories.includes(category) ? styles.active : ''}`}
                                    onClick={() => toggleCategory(category)}
                                >
                                    {category}
                                </span>
                            )) : <p style={{ color: '#5f5e5a', padding: '10px' }}>No filters available</p> }
                        </div>
                    </div>
                    <Textarea
                        label="Description"
                        name="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of this location..."
                    />
                </div>

                <div className={styles.block}>
                    <h2><LuMapPin /> Pin Location on Map</h2>
                    <div className={styles.mapPicker}>
                        <MapPicker lat={lat} lng={lng} onChange={handlePinChange} center={mapCenter} zoom={mapZoom} />
                        <div className={styles.mapHint}><span>{HINTS[mapHint]}</span></div>
                    </div>
                    <div className={styles.columns}>
                        <Input
                            label="Latitude"
                            type="text"
                            name="latitude"
                            value={lat}
                            onChange={e => setLat(e.target.value)}
                            placeholder="e.g. 40.7128"
                            required={true}
                        />
                        <Input
                            label="Longitude"
                            type="text"
                            name="longitude"
                            value={lng}
                            onChange={e => setLng(e.target.value)}
                            placeholder="e.g. -74.0060"
                            required={true}
                        />
                    </div>
                    <div className={styles.geocode}>
                        <Input
                            label="Or search address to auto-fill coordinates"
                            type="text"
                            name="geocode"
                            value={geocode}
                            onChange={e => setGeocode(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode(); } }}
                            placeholder="Search address or place name..."
                            note="Uses OpenStreetMap Nominatim to find coordinates."
                        />
                        <Button value="Find" icon={<LuSearch />} onClick={handleGeocode} />
                    </div>
                </div>
            </div>

            {/* ROW 2: Address + contact */}
            <div className={styles.columns}>
                <div className={styles.block}>
                    <h2><LuHouse /> Address Details</h2>
                    <Input
                        label="Street Address"
                        type="text"
                        name="street"
                        value={street}
                        onChange={e => setStreet(e.target.value)}
                        placeholder="e.g. 350 5th Ave, New York"
                    />
                    <div className={styles.columns}>
                        <Input
                            label="City"
                            type="text"
                            name="city"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="City"
                            required={true}
                        />
                        <Input
                            label="State / Province"
                            type="text"
                            name="state"
                            value={state}
                            onChange={e => setState(e.target.value)}
                            placeholder="State"
                            required={true}
                        />
                        <Input
                            label="Postal Code"
                            type="text"
                            name="postal"
                            value={postal}
                            onChange={e => setPostal(e.target.value)}
                            placeholder="10118"
                        />
                    </div>
                    <Select
                        label="Country"
                        name="country"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        options={COUNTRIES}
                    />
                </div>

                <div className={styles.block}>
                    <h2><LuPhone /> Contact &amp; Links</h2>
                    <Input
                        label="Phone Number"
                        type="text"
                        name="phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder=""
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="store@example.com"
                    />
                    <Input
                        label="Website URL"
                        type="url"
                        name="website"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="https://yourstore.com"
                    />
                    {/* <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Store Image URL</label>
                        <div className={styles.imgUpload} onClick={() => toast.info('Image upload coming soon!')}>
                            <LuImage />
                            <strong>Click to upload store image</strong>
                            <p>PNG, JPG up to 2MB</p>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* ROW 3: Opening hours + settings */}
            <div className={styles.columns}>
                <div className={styles.block}>
                    <h2><LuClock /> Opening Hours <HiddenField locatorId={locatorId} show={selectedLocator?.show_filters} /></h2>
                    <div className={styles.hours}>
                        {DAYS.map(day => (
                            <div className={styles.hoursRow} key={day}>
                                <span className={styles.hoursDay}>{day}</span>
                                <span
                                    className={`${styles.hoursToggle} ${hours[day].enabled ? styles.on : ''}`}
                                    onClick={() => toggleDay(day)}
                                ></span>
                                {hours[day].enabled ? (
                                    <div className={styles.hoursTimes}>
                                        <input
                                            type="time"
                                            value={hours[day].open}
                                            onChange={e => updateDayTime(day, 'open', e.target.value)}
                                        />
                                        <span className={styles.hoursSep}>to</span>
                                        <input
                                            type="time"
                                            value={hours[day].close}
                                            onChange={e => updateDayTime(day, 'close', e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.hoursTimes}>
                                        <span className={styles.hoursClosed}>Closed</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.block}>
                    <h2><LuSettings /> Location Settings</h2>
                    <Checkbox
                        label="Published"
                        name="published"
                        description="Show this location on the widget"
                        checked={published}
                        onChange={() => setPublished(!published)}
                    />
                    <Checkbox
                        label="Show Store Hours"
                        name="opening_hours"
                        description="Display store hours on the store card for this location only"
                        checked={showOpeningHours}
                        onChange={() => setShowOpeningHours(!showOpeningHours)}
                    />
                    <Textarea
                        label="Custom Notes"
                        name="custom_notes"
                        value={customNotes}
                        onChange={e => setCustomNotes(e.target.value)}
                        placeholder="e.g. Parking available at basement level 2..."
                    />
                </div>
            </div>

            <div className={styles.buttons}>
                <div className={styles.requiredNote}>
                    <LuInfo />
                    <p>
                        <span>* Required fields must be filled before saving. </span>
                        <span>* Any field left blank will not be displayed in the locator. </span>
                    </p>
                </div>
                <Button value="Cancel" icon={<LuChevronLeft />} onClick={() => router.back()} />
                <Button
                    type="submit"
                    name="save_location"
                    value="Save Location"
                    icon={<LuCheck />}
                    iconPosition="right"
                    primary={true}
                    disabled={!isValid}
                />
            </div>

        </form>
    );
}


const HiddenField = ({ locatorId, show }) => {
    if(locatorId === '') return null;
    if(!show) return null;
    return <span className='info'>
        <span className='info-text'>
            <LuInfo /> Hidden from locator
        </span>
        <span className='info-description'>This field is currently set as hidden from the locator. To show it, please edit the locator and enable the field.</span>
    </span>
}