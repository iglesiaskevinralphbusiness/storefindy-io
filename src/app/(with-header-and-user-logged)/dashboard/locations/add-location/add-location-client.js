'use client';
import styles from '../../Dashboard.module.scss';
import { useState, useEffect, forwardRef, useActionState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LuInfo, LuMapPin, LuHouse, LuPhone, LuClock, LuSettings, LuCheck, LuChevronLeft, LuPlus, LuRefreshCw, LuImage, LuSearch, LuTrash2 } from "react-icons/lu";
import Input from '@/components/Forms/Input';
import Textarea from '@/components/Forms/Textarea';
import Select from '@/components/Forms/Select';
import Checkbox from '@/components/Forms/Checkbox';
import Button from '@/components/Forms/Button';
import { COUNTRIES } from '@/utils/constant';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { postCreateLocation, postEditLocation } from '@/actions/locations';

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

// "HH:MM" <-> Date (on today) helpers for the time picker.
const timeToDate = (hm) => {
    const [h, m] = hm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};
const dateToTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

// Styled trigger for the time picker: bordered field matching the form inputs, with a clock icon.
const TimeFieldInput = forwardRef(function TimeFieldInput({ value, onClick }, ref) {
    return (
        <div className={styles.timeField} onClick={onClick}>
            <LuClock />
            <input ref={ref} type="text" value={value} readOnly placeholder="--:--" />
        </div>
    );
});

// Time-only picker that greys out (disables) any time earlier than `min`.
const TimePicker = ({ value, min = '00:00', onChange }) => (
    <DatePicker
        selected={timeToDate(value)}
        onChange={date => date && onChange(dateToTime(date))}
        minTime={timeToDate(min)}
        maxTime={timeToDate('23:59')}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={30}
        timeCaption="Time"
        dateFormat="h:mm aa"
        customInput={<TimeFieldInput />}
    />
);

export default function AddLocationPage({ locators, data }) {
    const router = useRouter();

    // Basic information
    const [storeName, setStoreName] = useState(data?.name || '');
    const [locatorId, setLocatorId] = useState(data?.locator_id || '');
    const [categories, setCategories] = useState(data?.filters || []);
    const [description, setDescription] = useState(data?.description || '');

    // Map / coordinates
    const [lat, setLat] = useState(data?.latitude || '');
    const [lng, setLng] = useState(data?.longitude || '');
    const [geocode, setGeocode] = useState('');
    const [mapHint, setMapHint] = useState('idle');

    // Fallback the map starts on when geolocation is denied/unavailable.
    // Same `{ code, label }` shape as COUNTRIES so it stays consistent with the locator — change it anytime.
    const [defaultMapLocation, setDefaultMapLocation] = useState({ code: 'us', label: 'United States', lat: 40.7128, lng: -74.0060 });
    // Browser-detected position (option 1). null until granted; falls back to defaultMapLocation.
    const [userLocation, setUserLocation] = useState(null);
    const mapCenter = userLocation ?? [defaultMapLocation.lat, defaultMapLocation.lng];
    const mapZoom = userLocation ? 13 : 4;

    // Address
    const [street, setStreet] = useState(data?.street || '');
    const [city, setCity] = useState(data?.city || '');
    const [stateProvince, setStateProvince] = useState(data?.state || '');
    const [postal, setPostal] = useState(data?.postal || '');
    const [country, setCountry] = useState(data?.country || 'ph');

    // Contact & links
    const [phone, setPhone] = useState(data?.phone || '');
    const [email, setEmail] = useState(data?.email || '');
    const [website, setWebsite] = useState(data?.website || '');

    // Opening hours
    const [hours, setHours] = useState(data?.hours || DEFAULT_HOURS);
    const [locationStatus, setLocationStatus] = useState(data?.location_status || 'open');

    // Holiday / special hours. The pickers hold Date objects; entries store local ISO (YYYY-MM-DD) strings.
    const [holidayFrom, setHolidayFrom] = useState(null);
    const [holidayTo, setHolidayTo] = useState(null);
    const [holidays, setHolidays] = useState(data?.holidays || []);
    // Local "today" — used as the earliest selectable date.
    const todayISO = new Date().toLocaleDateString('en-CA');
    const today = new Date(`${todayISO}T00:00:00`);

    // Location settings
    const [published, setPublished] = useState(data?.published || true);
    const [showOpeningHours, setShowOpeningHours] = useState(data?.show_opening_hours || false);
    const [customNotes, setCustomNotes] = useState(data?.custom_notes || '');

    // Locator options for the dropdown
    const [selectedLocator, setSelectedLocator] = useState(null);
    const locatorOptions = [{ code: '', label: '— Select a locator —' }, ...locators.map(locator => ({ code: locator._id, label: locator.name }))];
    

    useEffect(() => {
        const locationOption = locators.find(locator => locator._id === locatorId);
        if(locationOption) {
            setSelectedLocator(locationOption);

            // When browser location is disabled, re-center the map on the locator's default country.
            if (!userLocation && locationOption.default_country) {
                const match = COUNTRIES.find(c => c.code === locationOption.default_country);
                if (match) setDefaultMapLocation(match);
            }
        } else {
            setSelectedLocator(null);
        }
        if(locationOption && locationOption._id === data?.locator_id) {
            setCategories(data?.filters || []);
        } else {
            setCategories([]);
        }
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
        setHours(prev => {
            const next = { ...prev[day], [field]: value };
            // Keep close >= open: block a close earlier than open, push close forward if open passes it.
            if (field === 'close' && value < next.open) return prev;
            if (field === 'open' && next.close < value) next.close = value;
            return { ...prev, [day]: next };
        });
    };

    // Local ISO (YYYY-MM-DD) <-> Date helpers, kept timezone-safe.
    const toISO = (date) => date.toLocaleDateString('en-CA');
    const parseISO = (iso) => new Date(`${iso}T00:00:00`);
    // Already-used ranges, fed to the pickers so those days can't be selected again.
    const excludedIntervals = holidays.map(h => ({ start: parseISO(h.from), end: parseISO(h.to) }));

    // The "To" date can't reach into the next booked range, so cap it the day before
    // the earliest existing holiday that starts after the chosen "From".
    const holidayFromISO = holidayFrom ? toISO(holidayFrom) : null;
    const nextBlockedStart = holidayFromISO
        ? holidays.map(h => h.from).filter(from => from > holidayFromISO).sort()[0]
        : null;
    let holidayToMax;
    if (nextBlockedStart) {
        holidayToMax = parseISO(nextBlockedStart);
        holidayToMax.setDate(holidayToMax.getDate() - 1);
    }

    // Adds a holiday/special-hours entry, keeping the list sorted by start date.
    const addHoliday = () => {
        if (!holidayFrom || !holidayTo) {
            toast.error('Please select both From and To dates.');
            return;
        }
        const from = toISO(holidayFrom);
        const to = toISO(holidayTo);
        if (from < todayISO) {
            toast.error('Please select a date that is not in the past.');
            return;
        }
        if (to < from) {
            toast.error('The To date must be on or after the From date.');
            return;
        }
        // The pickers disable used days, but a range can still straddle one — reject overlaps.
        if (holidays.some(h => from <= h.to && to >= h.from)) {
            toast.error('That date range overlaps an existing holiday.');
            return;
        }
        setHolidays(prev => [
            ...prev,
            { from, to, enabled: true, open: '08:00', close: '17:00' },
        ].sort((a, b) => a.from.localeCompare(b.from)));
        setHolidayFrom(null);
        setHolidayTo(null);
    };

    const toggleHoliday = (index) => {
        setHolidays(prev => prev.map((h, i) => i === index ? { ...h, enabled: !h.enabled } : h));
    };

    const updateHolidayTime = (index, field, value) => {
        setHolidays(prev => prev.map((h, i) => {
            if (i !== index) return h;
            const next = { ...h, [field]: value };
            // Keep close >= open: block a close earlier than open, push close forward if open passes it.
            if (field === 'close' && value < next.open) return h;
            if (field === 'open' && next.close < value) next.close = value;
            return next;
        }));
    };

    const removeHoliday = (index) => {
        setHolidays(prev => prev.filter((_, i) => i !== index));
    };

    // Formats a holiday entry, collapsing the shared parts of a range.
    // Same day → "Jun 4, 2026"; same month/year → "Jun 4 -⏎18, 2026"; otherwise the full range.
    const formatHolidayRange = (from, to) => {
        const f = new Date(`${from}T00:00:00`);
        const t = new Date(`${to}T00:00:00`);
        const full = { month: 'short', day: 'numeric', year: 'numeric' };
        if (from === to) return f.toLocaleDateString(undefined, full);
        if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) {
            return <>{f.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -<br />{t.getDate()}, {t.getFullYear()}</>;
        }
        return <>{f.toLocaleDateString(undefined, full)} -<br />{t.toLocaleDateString(undefined, full)}</>;
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
            } else {
                setMapHint('notfound');
            }
        } catch {
            setMapHint('error');
        }
    };

    const isValid = storeName.trim() !== '' && locatorId !== '' && lat !== '' && lng !== '' && city.trim() !== '' && stateProvince.trim() !== '';


    // form submit handler
    const postCreateLocationWithParams = data ? postEditLocation.bind(null, data._id, categories, hours, holidays) : postCreateLocation.bind(null, categories, hours, holidays);
    const [state, action, pending] = useActionState(postCreateLocationWithParams, { status: "idle" });
    const err = (field) => state.status === "error" ? state.errors[field] : undefined;
    useEffect(() => {
        if (state.status === "idle") return;
        if (state.status === "success") {
            toast.success(data ? "Location updated successfully" : "Location added successfully", { description: state.message });
            router.push('/dashboard/locations');
        } else if (state.status === "error") {
            toast.warning("Some fields are not valid", { description: Object.values(state.errors)[0] });
        } else if (state.status === "fatal") {
            toast.error("Something went wrong", { description: state.message });
        }
    }, [state]);

    return (
        <form className={styles.create} action={action}>

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
                        error={err("store_name")}
                    />
                    <Select
                        label="Locator"
                        name="locator_id"
                        value={locatorId}
                        onChange={e => setLocatorId(e.target.value)}
                        options={locatorOptions}
                        required={true}
                        note="Which locator will show this location?"
                        error={err("locator_id")}
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
                            error={err("city")}
                        />
                        <Input
                            label="State / Province"
                            type="text"
                            name="state"
                            value={stateProvince}
                            onChange={e => setStateProvince(e.target.value)}
                            placeholder="State"
                            required={true}
                            error={err("state")}
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
                        required={true}
                        error={err("country")}
                    />
                </div>
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
                        error={err("latitude")}
                    />
                    <Input
                        label="Longitude"
                        type="text"
                        name="longitude"
                        value={lng}
                        onChange={e => setLng(e.target.value)}
                        placeholder="e.g. -74.0060"
                        required={true}
                        error={err("longitude")}
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
                    />
                    <Button value="Find" icon={<LuSearch />} onClick={handleGeocode} />
                </div>
            </div>

            <div className={styles.columns}>
                <div className={styles.block}>
                    <h2><LuClock /> Business Hours <HiddenField locatorId={locatorId} show={selectedLocator?.show_filters} /></h2>
                    <Select
                        label="Location Status"
                        name="location_status"
                        value={locationStatus}
                        onChange={e => setLocationStatus(e.target.value)}
                        options={[
                            { code: 'open', label: 'Open' },
                            { code: 'temporarily_closed', label: 'Temporarily Closed' },
                            { code: 'coming_soon', label: 'Coming Soon' },
                        ]}
                        error={err("location_status")}
                    />
                    { locationStatus === 'open' && <>
                        <div className={styles.hours}>
                            <p>Main hours of operation of your location</p>
                            {DAYS.map(day => (
                                <div className={styles.hoursRow} key={day}>
                                    <span className={styles.hoursDay}>{day}</span>
                                    <span
                                        className={`${styles.hoursToggle} ${hours[day].enabled ? styles.on : ''}`}
                                        onClick={() => toggleDay(day)}
                                    ></span>
                                    {hours[day].enabled ? (
                                        <div className={styles.hoursTimes}>
                                            <TimePicker
                                                value={hours[day].open}
                                                onChange={val => updateDayTime(day, 'open', val)}
                                            />
                                            <span className={styles.hoursSep}>to</span>
                                            <TimePicker
                                                value={hours[day].close}
                                                min={hours[day].open}
                                                onChange={val => updateDayTime(day, 'close', val)}
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
                    </>}
                </div>

                <div className={styles.block}>
                    <h2><LuClock /> Holiday / Special Hours <HiddenField locatorId={locatorId} show={selectedLocator?.show_filters} /></h2>
                    <div className={styles.geocode}>
                        <div className={styles.holidayPicker}>
                            <label>From</label>
                            <DatePicker
                                selected={holidayFrom}
                                onChange={date => setHolidayFrom(date)}
                                minDate={today}
                                excludeDateIntervals={excludedIntervals}
                                dateFormat="MMM d, yyyy"
                                placeholderText="Select date"
                            />
                        </div>
                        <div className={styles.holidayPicker}>
                            <label>To</label>
                            <DatePicker
                                selected={holidayTo}
                                onChange={date => setHolidayTo(date)}
                                minDate={holidayFrom || today}
                                maxDate={holidayToMax}
                                excludeDateIntervals={excludedIntervals}
                                dateFormat="MMM d, yyyy"
                                placeholderText="Select date"
                            />
                        </div>
                        <Button
                            value="Add"
                            icon={<LuPlus />}
                            primary={true}
                            onClick={addHoliday}
                            disabled={locationStatus !== 'open'}
                        />
                    </div>
                    { locationStatus === 'open' && <>
                        <div className={styles.hours}>
                            <p>Hours of operation for a brief period of time, like for a special event. Your regular business hours don't change.</p>
                            {holidays.length > 0 && (
                                <>
                                    {holidays.map((holiday, index) => (
                                        <div className={styles.hoursRow} key={`${holiday.from}-${holiday.to}-${index}`}>
                                            <span className={styles.hoursDay} style={{ width: 'auto', minWidth: '92px' }}>
                                                {formatHolidayRange(holiday.from, holiday.to)}
                                            </span>
                                            <span
                                                className={`${styles.hoursToggle} ${holiday.enabled ? styles.on : ''}`}
                                                onClick={() => toggleHoliday(index)}
                                            ></span>
                                            {holiday.enabled ? (
                                                <div className={styles.hoursTimes}>
                                                    <TimePicker
                                                        value={holiday.open}
                                                        onChange={val => updateHolidayTime(index, 'open', val)}
                                                    />
                                                    <span className={styles.hoursSep}>to</span>
                                                    <TimePicker
                                                        value={holiday.close}
                                                        min={holiday.open}
                                                        onChange={val => updateHolidayTime(index, 'close', val)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.hoursTimes}>
                                                    <span className={styles.hoursClosed}>Closed</span>
                                                </div>
                                            )}
                                            <LuTrash2
                                                style={{ cursor: 'pointer', color: '#c0392b', flexShrink: 0 }}
                                                onClick={() => removeHoliday(index)}
                                            />
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </>}
                </div>
            </div>

            <div className={styles.columns}>
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
                        error={err("email")}
                    />
                    <Input
                        label="Website URL"
                        type="url"
                        name="website"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="https://yourstore.com"
                        error={err("website")}
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

                <div className={styles.block}>
                    <h2><LuSettings /> Location Settings</h2>
                    <Checkbox
                        label="Published"
                        name="published"
                        description="Show this location on the locator widget"
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
                <Button value="Back" icon={<LuChevronLeft />} onClick={() => router.back()} />
                <Button
                    type="submit"
                    name="save_location"
                    value="Save Location"
                    icon={<LuCheck />}
                    iconPosition="right"
                    primary={true}
                    disabled={!isValid}
                    pending={pending}
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