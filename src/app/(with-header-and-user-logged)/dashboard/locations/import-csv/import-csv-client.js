'use client';
import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowRightLine } from "react-icons/ri";
import {
    LuMap, LuPlus, LuRefreshCw, LuPencil, LuFileSpreadsheet, LuDownload,
    LuCloudUpload, LuFileCheck, LuCircleCheck, LuAsterisk, LuCircleDashed,
    LuArrowLeftRight, LuArrowRight, LuArrowLeft, LuTable, LuTriangleAlert,
    LuCircleX, LuCircleAlert, LuCheck, LuList, LuEye,
} from 'react-icons/lu';
import Sidebar from '@/components/Dashboard/Sidebar';
import Button from '@/components/Forms/Button';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getLocators } from '@/actions/locator';
import { importCSV } from '@/actions/locations';
import { COUNTRIES } from '@/utils/constant/countries';
import styles from '../../Dashboard.module.scss';
import csv from './ImportCsv.module.scss';

const SKIP = '— Skip this column —';

// Country code saved when the CSV country can't be matched to our list.
const DEFAULT_COUNTRY = 'us';

// Lookup keyed by both the full label and the code (both lowercased) -> country code.
// Lets a CSV provide either "Philippines" or "ph" and resolve to "ph".
const COUNTRY_LOOKUP = (() => {
    const map = new Map();
    for (const c of COUNTRIES) {
        map.set(c.label.toLowerCase(), c.code);
        map.set(c.code.toLowerCase(), c.code);
    }
    return map;
})();

// Reverse lookup: country code -> display label (e.g. "ph" -> "Philippines").
const CODE_TO_LABEL = (() => {
    const map = new Map();
    for (const c of COUNTRIES) map.set(c.code, c.label);
    return map;
})();

// Real US cities (with accurate lat/lng) used to generate the localhost staging CSV.
// Two branches are generated per city, so this list yields 2× locations (300+).
const US_CITIES = [
    { city: 'New York', state: 'New York', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', state: 'California', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago', state: 'Illinois', lat: 41.8781, lng: -87.6298 },
    { city: 'Houston', state: 'Texas', lat: 29.7604, lng: -95.3698 },
    { city: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0740 },
    { city: 'Philadelphia', state: 'Pennsylvania', lat: 39.9526, lng: -75.1652 },
    { city: 'San Antonio', state: 'Texas', lat: 29.4241, lng: -98.4936 },
    { city: 'San Diego', state: 'California', lat: 32.7157, lng: -117.1611 },
    { city: 'Dallas', state: 'Texas', lat: 32.7767, lng: -96.7970 },
    { city: 'San Jose', state: 'California', lat: 37.3382, lng: -121.8863 },
    { city: 'Austin', state: 'Texas', lat: 30.2672, lng: -97.7431 },
    { city: 'Jacksonville', state: 'Florida', lat: 30.3322, lng: -81.6557 },
    { city: 'Fort Worth', state: 'Texas', lat: 32.7555, lng: -97.3308 },
    { city: 'Columbus', state: 'Ohio', lat: 39.9612, lng: -82.9988 },
    { city: 'Charlotte', state: 'North Carolina', lat: 35.2271, lng: -80.8431 },
    { city: 'San Francisco', state: 'California', lat: 37.7749, lng: -122.4194 },
    { city: 'Indianapolis', state: 'Indiana', lat: 39.7684, lng: -86.1581 },
    { city: 'Seattle', state: 'Washington', lat: 47.6062, lng: -122.3321 },
    { city: 'Denver', state: 'Colorado', lat: 39.7392, lng: -104.9903 },
    { city: 'Washington', state: 'District of Columbia', lat: 38.9072, lng: -77.0369 },
    { city: 'Boston', state: 'Massachusetts', lat: 42.3601, lng: -71.0589 },
    { city: 'El Paso', state: 'Texas', lat: 31.7619, lng: -106.4850 },
    { city: 'Nashville', state: 'Tennessee', lat: 36.1627, lng: -86.7816 },
    { city: 'Detroit', state: 'Michigan', lat: 42.3314, lng: -83.0458 },
    { city: 'Oklahoma City', state: 'Oklahoma', lat: 35.4676, lng: -97.5164 },
    { city: 'Portland', state: 'Oregon', lat: 45.5152, lng: -122.6784 },
    { city: 'Las Vegas', state: 'Nevada', lat: 36.1699, lng: -115.1398 },
    { city: 'Memphis', state: 'Tennessee', lat: 35.1495, lng: -90.0490 },
    { city: 'Louisville', state: 'Kentucky', lat: 38.2527, lng: -85.7585 },
    { city: 'Baltimore', state: 'Maryland', lat: 39.2904, lng: -76.6122 },
    { city: 'Milwaukee', state: 'Wisconsin', lat: 43.0389, lng: -87.9065 },
    { city: 'Albuquerque', state: 'New Mexico', lat: 35.0844, lng: -106.6504 },
    { city: 'Tucson', state: 'Arizona', lat: 32.2226, lng: -110.9747 },
    { city: 'Fresno', state: 'California', lat: 36.7378, lng: -119.7871 },
    { city: 'Sacramento', state: 'California', lat: 38.5816, lng: -121.4944 },
    { city: 'Kansas City', state: 'Missouri', lat: 39.0997, lng: -94.5786 },
    { city: 'Mesa', state: 'Arizona', lat: 33.4152, lng: -111.8315 },
    { city: 'Atlanta', state: 'Georgia', lat: 33.7490, lng: -84.3880 },
    { city: 'Omaha', state: 'Nebraska', lat: 41.2565, lng: -95.9345 },
    { city: 'Colorado Springs', state: 'Colorado', lat: 38.8339, lng: -104.8214 },
    { city: 'Raleigh', state: 'North Carolina', lat: 35.7796, lng: -78.6382 },
    { city: 'Long Beach', state: 'California', lat: 33.7701, lng: -118.1937 },
    { city: 'Virginia Beach', state: 'Virginia', lat: 36.8529, lng: -75.9780 },
    { city: 'Miami', state: 'Florida', lat: 25.7617, lng: -80.1918 },
    { city: 'Oakland', state: 'California', lat: 37.8044, lng: -122.2712 },
    { city: 'Minneapolis', state: 'Minnesota', lat: 44.9778, lng: -93.2650 },
    { city: 'Tulsa', state: 'Oklahoma', lat: 36.1540, lng: -95.9928 },
    { city: 'Bakersfield', state: 'California', lat: 35.3733, lng: -119.0187 },
    { city: 'Wichita', state: 'Kansas', lat: 37.6872, lng: -97.3301 },
    { city: 'Arlington', state: 'Texas', lat: 32.7357, lng: -97.1081 },
    { city: 'Aurora', state: 'Colorado', lat: 39.7294, lng: -104.8319 },
    { city: 'Tampa', state: 'Florida', lat: 27.9506, lng: -82.4572 },
    { city: 'New Orleans', state: 'Louisiana', lat: 29.9511, lng: -90.0715 },
    { city: 'Cleveland', state: 'Ohio', lat: 41.4993, lng: -81.6944 },
    { city: 'Honolulu', state: 'Hawaii', lat: 21.3069, lng: -157.8583 },
    { city: 'Anaheim', state: 'California', lat: 33.8366, lng: -117.9143 },
    { city: 'Lexington', state: 'Kentucky', lat: 38.0406, lng: -84.5037 },
    { city: 'Stockton', state: 'California', lat: 37.9577, lng: -121.2908 },
    { city: 'Corpus Christi', state: 'Texas', lat: 27.8006, lng: -97.3964 },
    { city: 'Henderson', state: 'Nevada', lat: 36.0395, lng: -114.9817 },
    { city: 'Riverside', state: 'California', lat: 33.9806, lng: -117.3755 },
    { city: 'Newark', state: 'New Jersey', lat: 40.7357, lng: -74.1724 },
    { city: 'Saint Paul', state: 'Minnesota', lat: 44.9537, lng: -93.0900 },
    { city: 'Santa Ana', state: 'California', lat: 33.7455, lng: -117.8677 },
    { city: 'Cincinnati', state: 'Ohio', lat: 39.1031, lng: -84.5120 },
    { city: 'Irvine', state: 'California', lat: 33.6846, lng: -117.8265 },
    { city: 'Orlando', state: 'Florida', lat: 28.5383, lng: -81.3792 },
    { city: 'Pittsburgh', state: 'Pennsylvania', lat: 40.4406, lng: -79.9959 },
    { city: 'St. Louis', state: 'Missouri', lat: 38.6270, lng: -90.1994 },
    { city: 'Greensboro', state: 'North Carolina', lat: 36.0726, lng: -79.7920 },
    { city: 'Jersey City', state: 'New Jersey', lat: 40.7178, lng: -74.0431 },
    { city: 'Anchorage', state: 'Alaska', lat: 61.2181, lng: -149.9003 },
    { city: 'Lincoln', state: 'Nebraska', lat: 40.8136, lng: -96.7026 },
    { city: 'Plano', state: 'Texas', lat: 33.0198, lng: -96.6989 },
    { city: 'Durham', state: 'North Carolina', lat: 35.9940, lng: -78.8986 },
    { city: 'Buffalo', state: 'New York', lat: 42.8864, lng: -78.8784 },
    { city: 'Chandler', state: 'Arizona', lat: 33.3062, lng: -111.8413 },
    { city: 'Chula Vista', state: 'California', lat: 32.6401, lng: -117.0842 },
    { city: 'Toledo', state: 'Ohio', lat: 41.6528, lng: -83.5379 },
    { city: 'Madison', state: 'Wisconsin', lat: 43.0731, lng: -89.4012 },
    { city: 'Gilbert', state: 'Arizona', lat: 33.3528, lng: -111.7890 },
    { city: 'Reno', state: 'Nevada', lat: 39.5296, lng: -119.8138 },
    { city: 'Fort Wayne', state: 'Indiana', lat: 41.0793, lng: -85.1394 },
    { city: 'North Las Vegas', state: 'Nevada', lat: 36.1989, lng: -115.1175 },
    { city: 'Lubbock', state: 'Texas', lat: 33.5779, lng: -101.8552 },
    { city: 'St. Petersburg', state: 'Florida', lat: 27.7676, lng: -82.6403 },
    { city: 'Laredo', state: 'Texas', lat: 27.5306, lng: -99.4803 },
    { city: 'Irving', state: 'Texas', lat: 32.8140, lng: -96.9489 },
    { city: 'Chesapeake', state: 'Virginia', lat: 36.7682, lng: -76.2875 },
    { city: 'Glendale', state: 'Arizona', lat: 33.5387, lng: -112.1860 },
    { city: 'Winston-Salem', state: 'North Carolina', lat: 36.0999, lng: -80.2442 },
    { city: 'Scottsdale', state: 'Arizona', lat: 33.4942, lng: -111.9261 },
    { city: 'Garland', state: 'Texas', lat: 32.9126, lng: -96.6389 },
    { city: 'Boise', state: 'Idaho', lat: 43.6150, lng: -116.2023 },
    { city: 'Norfolk', state: 'Virginia', lat: 36.8508, lng: -76.2859 },
    { city: 'Spokane', state: 'Washington', lat: 47.6588, lng: -117.4260 },
    { city: 'Fremont', state: 'California', lat: 37.5485, lng: -121.9886 },
    { city: 'Richmond', state: 'Virginia', lat: 37.5407, lng: -77.4360 },
    { city: 'Santa Clarita', state: 'California', lat: 34.3917, lng: -118.5426 },
    { city: 'San Bernardino', state: 'California', lat: 34.1083, lng: -117.2898 },
    { city: 'Baton Rouge', state: 'Louisiana', lat: 30.4515, lng: -91.1871 },
    { city: 'Hialeah', state: 'Florida', lat: 25.8576, lng: -80.2781 },
    { city: 'Tacoma', state: 'Washington', lat: 47.2529, lng: -122.4443 },
    { city: 'Modesto', state: 'California', lat: 37.6391, lng: -120.9969 },
    { city: 'Port St. Lucie', state: 'Florida', lat: 27.2730, lng: -80.3582 },
    { city: 'Huntsville', state: 'Alabama', lat: 34.7304, lng: -86.5861 },
    { city: 'Des Moines', state: 'Iowa', lat: 41.5868, lng: -93.6250 },
    { city: 'Moreno Valley', state: 'California', lat: 33.9425, lng: -117.2297 },
    { city: 'Fontana', state: 'California', lat: 34.0922, lng: -117.4350 },
    { city: 'Frisco', state: 'Texas', lat: 33.1507, lng: -96.8236 },
    { city: 'Rochester', state: 'New York', lat: 43.1566, lng: -77.6088 },
    { city: 'Yonkers', state: 'New York', lat: 40.9312, lng: -73.8987 },
    { city: 'Fayetteville', state: 'North Carolina', lat: 35.0527, lng: -78.8784 },
    { city: 'Worcester', state: 'Massachusetts', lat: 42.2626, lng: -71.8023 },
    { city: 'Columbus', state: 'Georgia', lat: 32.4610, lng: -84.9877 },
    { city: 'Cape Coral', state: 'Florida', lat: 26.5629, lng: -81.9495 },
    { city: 'McKinney', state: 'Texas', lat: 33.1972, lng: -96.6398 },
    { city: 'Salt Lake City', state: 'Utah', lat: 40.7608, lng: -111.8910 },
    { city: 'Little Rock', state: 'Arkansas', lat: 34.7465, lng: -92.2896 },
    { city: 'Amarillo', state: 'Texas', lat: 35.2220, lng: -101.8313 },
    { city: 'Augusta', state: 'Georgia', lat: 33.4735, lng: -82.0105 },
    { city: 'Grand Rapids', state: 'Michigan', lat: 42.9634, lng: -85.6681 },
    { city: 'Mobile', state: 'Alabama', lat: 30.6954, lng: -88.0399 },
    { city: 'Knoxville', state: 'Tennessee', lat: 35.9606, lng: -83.9207 },
    { city: 'Grand Prairie', state: 'Texas', lat: 32.7459, lng: -96.9978 },
    { city: 'Overland Park', state: 'Kansas', lat: 38.9822, lng: -94.6708 },
    { city: 'Brownsville', state: 'Texas', lat: 25.9017, lng: -97.4975 },
    { city: 'Newport News', state: 'Virginia', lat: 37.0871, lng: -76.4730 },
    { city: 'Santa Rosa', state: 'California', lat: 38.4404, lng: -122.7141 },
    { city: 'Providence', state: 'Rhode Island', lat: 41.8240, lng: -71.4128 },
    { city: 'Fort Lauderdale', state: 'Florida', lat: 26.1224, lng: -80.1373 },
    { city: 'Chattanooga', state: 'Tennessee', lat: 35.0456, lng: -85.3097 },
    { city: 'Tempe', state: 'Arizona', lat: 33.4255, lng: -111.9400 },
    { city: 'Oceanside', state: 'California', lat: 33.1959, lng: -117.3795 },
    { city: 'Garden Grove', state: 'California', lat: 33.7739, lng: -117.9414 },
    { city: 'Rancho Cucamonga', state: 'California', lat: 34.1064, lng: -117.5931 },
    { city: 'Ontario', state: 'California', lat: 34.0633, lng: -117.6509 },
    { city: 'Vancouver', state: 'Washington', lat: 45.6387, lng: -122.6615 },
    { city: 'Sioux Falls', state: 'South Dakota', lat: 43.5446, lng: -96.7311 },
    { city: 'Peoria', state: 'Arizona', lat: 33.5806, lng: -112.2374 },
    { city: 'Springfield', state: 'Missouri', lat: 37.2090, lng: -93.2923 },
    { city: 'Pembroke Pines', state: 'Florida', lat: 26.0078, lng: -80.2963 },
    { city: 'Elk Grove', state: 'California', lat: 38.4088, lng: -121.3716 },
    { city: 'Salem', state: 'Oregon', lat: 44.9429, lng: -123.0351 },
    { city: 'Corona', state: 'California', lat: 33.8753, lng: -117.5664 },
    { city: 'Eugene', state: 'Oregon', lat: 44.0521, lng: -123.0868 },
    { city: 'Jackson', state: 'Mississippi', lat: 32.2988, lng: -90.1848 },
    { city: 'Fort Collins', state: 'Colorado', lat: 40.5853, lng: -105.0844 },
    { city: 'Cary', state: 'North Carolina', lat: 35.7915, lng: -78.7811 },
    { city: 'Lancaster', state: 'California', lat: 34.6868, lng: -118.1542 },
    { city: 'Hayward', state: 'California', lat: 37.6688, lng: -122.0808 },
    { city: 'Palmdale', state: 'California', lat: 34.5794, lng: -118.1165 },
    { city: 'Salinas', state: 'California', lat: 36.6777, lng: -121.6555 },
    { city: 'Alexandria', state: 'Virginia', lat: 38.8048, lng: -77.0469 },
    { city: 'Pomona', state: 'California', lat: 34.0551, lng: -117.7500 },
    { city: 'Sunnyvale', state: 'California', lat: 37.3688, lng: -122.0363 },
    { city: 'Escondido', state: 'California', lat: 33.1192, lng: -117.0864 },
    { city: 'Kansas City', state: 'Kansas', lat: 39.1155, lng: -94.6268 },
    { city: 'Rockford', state: 'Illinois', lat: 42.2711, lng: -89.0940 },
    { city: 'Joliet', state: 'Illinois', lat: 41.5250, lng: -88.0817 },
];

// Rotated place-type suffixes so generated store names stay distinct and read like
// real public locations (malls, plazas, town centers, etc.).
const PLACE_TYPES = ['Downtown', 'Grand Mall', 'City Plaza', 'Town Center', 'Marketplace', 'Galleria'];

// Build a staging CSV (used only on localhost) of US-only locations — 300+ rows.
// Two branches are created per city, each named "StoreFindy <City> <PlaceType>".
const STAGING_DATA = (() => {
    const header = 'name,city,state,country,lat,lng,phone,email,website';
    const round = (n) => Number(n.toFixed(4));
    const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');
    const website = 'https://www.storefindy.com';
    const lines = [header];
    US_CITIES.forEach((c, idx) => {
        // Two branches per city, offset slightly so they sit at distinct coordinates.
        const branches = [
            { off: 0.012, n: 1 },
            { off: -0.018, n: 2 },
        ];
        branches.forEach((b, bi) => {
            const place = PLACE_TYPES[(idx + bi) % PLACE_TYPES.length];
            const name = `StoreFindy ${c.city} ${place}`;
            const lat = round(c.lat + b.off);
            const lng = round(c.lng + b.off);
            // US-formatted phone: +1 (AAA) 555-XXXX
            const area = String(200 + (idx % 700));
            const phone = `+1 (${area}) 555-${String(1000 + idx).slice(-4)}`;
            const email = `storefindy.${slug(c.city)}${b.n}@example.com`;
            lines.push(`${name},${c.city},${c.state},United States,${lat},${lng},${phone},${email},${website}`);
        });
    });
    return lines.join('\n');
})();

// Resolve a raw CSV country value to a Storefindy country code.
// Returns { code, matched }; unmatched values fall back to DEFAULT_COUNTRY.
function resolveCountry(raw) {
    const key = (raw ?? '').trim().toLowerCase();
    const code = COUNTRY_LOOKUP.get(key);
    return code ? { code, matched: true } : { code: DEFAULT_COUNTRY, matched: false };
}

// Storefindy fields the CSV maps onto.
const REQUIRED_FIELDS = ['name', 'city', 'state', 'country', 'lat', 'lng'];
const OPTIONAL_FIELDS = ['phone', 'email', 'website'];
const SF_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS = {
    name: 'Store name', city: 'City', state: 'State / Province', country: 'Country',
    lat: 'Latitude (decimal)', lng: 'Longitude (decimal)',
    phone: 'Phone number', email: 'Email address', website: 'Website URL',
};

// Header synonyms used to auto-match a CSV column to a Storefindy field.
const SYNONYMS = {
    name: ['name', 'store_name', 'store', 'location', 'location_name', 'title'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    country: ['country', 'nation'],
    lat: ['lat', 'latitude'],
    lng: ['lng', 'lon', 'long', 'longitude'],
    phone: ['phone', 'phone_no', 'phone_number', 'tel', 'telephone', 'mobile'],
    email: ['email', 'email_addr', 'email_address', 'mail'],
    website: ['website', 'web', 'url', 'site', 'homepage'],
};

const STEP_HINTS = [
    'Select your locator and import mode',
    'Upload your CSV file',
    'Map your CSV columns to Storefindy fields',
    'Review the data then click Import',
];

const STEPS = [
    { label: 'Select Locator', sub: 'Choose target' },
    { label: 'Upload CSV', sub: 'Upload your file' },
    { label: 'Map Fields', sub: 'Match columns' },
    { label: 'Preview & Import', sub: 'Review then import' },
];

const IMPORT_MODES = [
    { id: 'append', title: 'Append', icon: <LuPlus />, desc: 'Add new locations to existing ones. Nothing gets deleted.' },
    { id: 'replace', title: 'Replace All', icon: <LuRefreshCw />, desc: 'Delete all existing locations and replace with CSV data.' },
    { id: 'update', title: 'Update Existing', icon: <LuPencil />, desc: 'Update matching locations by name. Add new ones.' },
];

// Minimal CSV parser supporting quoted fields and escaped quotes.
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n') {
            row.push(field); rows.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    // Drop fully empty trailing rows.
    return rows.filter(r => r.some(v => v.trim() !== ''));
}

function autoMatch(header) {
    const norm = header.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const field of SF_FIELDS) {
        if (SYNONYMS[field].includes(norm)) return field;
    }
    return '';
}

// Renders the 4-step progress header. `step` of 5 marks every step complete (success view).
function Stepper({ step }) {
    return (
        <div className={csv.steps}>
            {STEPS.map((s, idx) => {
                const num = idx + 1;
                const state = num < step ? 'done' : num === step ? 'active' : 'pending';
                return (
                    <Fragment key={s.label}>
                        <div className={csv.step}>
                            <div className={`${csv.stepNum} ${csv[state]}`}>
                                {state === 'done' ? <LuCheck /> : num}
                            </div>
                            <div className={csv.stepInfo}>
                                <div className={csv.stepLabel}>{s.label}</div>
                                <div className={csv.stepSub}>{s.sub}</div>
                            </div>
                        </div>
                        {num < 4 && <div className={`${csv.stepLine} ${num < step ? csv.done : ''}`} />}
                    </Fragment>
                );
            })}
        </div>
    );
}

// The 4-step CSV import wizard.
function ImportWizard({ locators }) {
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [locatorId, setLocatorId] = useState(locators[0]?._id ?? '');
    const [mode, setMode] = useState('append');

    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]); // array of string[]
    const [mapping, setMapping] = useState({}); // header -> sf field
    const [dragging, setDragging] = useState(false);
    const [imported, setImported] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null); // server response on success
    const [tooltip, setTooltip] = useState(null); // { top, left, lines } for the status hover tooltip

    // Show the status tooltip anchored below the hovered badge (fixed-positioned so it isn't clipped).
    function showTooltip(e, lines) {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ top: r.bottom + 6, left: r.left, lines });
    }

    const selectedLocator = locators.find(l => l._id === locatorId);
    const selectedLocatorName = selectedLocator?.name ?? '';

    // Per-row validation: error if a required field is missing or lat/lng isn't numeric;
    // warning if an optional field is blank.
    const evaluated = useMemo(() => rows.map(row => {
        // Map the parsed row to a { field: value } object using the current mapping.
        const obj = {};
        headers.forEach((h, i) => {
            const field = mapping[h];
            if (field) obj[field] = (row[i] ?? '').trim();
        });

        // Resolve the country to a code. Keep the original label for the warning,
        // and store the resolved code (defaulting to "us" when no match is found).
        const countryRaw = obj.country || '';
        let countryUnmatched = false;
        if (countryRaw) {
            const { code, matched } = resolveCountry(countryRaw);
            obj.country = code;
            countryUnmatched = !matched;
        }

        // Collect specific issues so the status badge can explain itself on hover.
        const issues = [];
        const missingRequired = REQUIRED_FIELDS.filter(f => !obj[f]);
        if (missingRequired.length) {
            issues.push(`Missing required field(s): ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`);
        }
        if (obj.lat && isNaN(Number(obj.lat))) issues.push('Latitude is not a valid number');
        if (obj.lng && isNaN(Number(obj.lng))) issues.push('Longitude is not a valid number');
        if (countryUnmatched) {
            issues.push(`Country "${countryRaw}" didn't match our list — defaulting to ${CODE_TO_LABEL.get(DEFAULT_COUNTRY)}`);
        }
        const missingOptional = OPTIONAL_FIELDS.filter(f => !obj[f]);
        if (missingOptional.length) {
            issues.push(`Missing optional field(s): ${missingOptional.map(f => FIELD_LABELS[f]).join(', ')}`);
        }

        let status = 'ok';
        if (missingRequired.length || (obj.lat && isNaN(Number(obj.lat))) || (obj.lng && isNaN(Number(obj.lng)))) {
            status = 'err';
        } else if (countryUnmatched || missingOptional.length) {
            status = 'warn';
        }
        return { obj, status, countryRaw, countryUnmatched, issues };
    }), [rows, mapping, headers]);

    const counts = useMemo(() => ({
        ok: evaluated.filter(r => r.status === 'ok').length,
        warn: evaluated.filter(r => r.status === 'warn').length,
        err: evaluated.filter(r => r.status === 'err').length,
        // Rows whose country couldn't be matched and fell back to the default.
        countryUnmatched: evaluated.filter(r => r.status !== 'err' && r.countryUnmatched).length,
    }), [evaluated]);

    const validRows = counts.ok + counts.warn;

    // Required fields all mapped? (needed to leave the mapping step)
    const allRequiredMapped = REQUIRED_FIELDS.every(f => Object.values(mapping).includes(f));

    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = parseCSV(String(e.target.result));
            if (!parsed.length) return;
            const head = parsed[0].map(h => h.trim());
            const dataRows = parsed.slice(1);
            const auto = {};
            head.forEach(h => { auto[h] = autoMatch(h); });
            setHeaders(head);
            setRows(dataRows);
            setMapping(auto);
            setFileName(file.name);
            setFileSize(file.size);
        };
        reader.readAsText(file);
    }

    function onDrop(e) {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
    }

    function downloadTemplate() {
        const data =
            'name,city,state,country,lat,lng,phone,email,website\n' +
            'SM Mall of Asia,Pasay City,Metro Manila,Philippines,14.5353,120.9822,+63 2 8556 0100,sm@sm.ph,https://sm.ph\n' +
            'Robinsons Galleria,Pasig City,Metro Manila,Philippines,14.5856,121.0567,+63 2 8633 9888,,https://robinsons.ph';
        const stagingData = STAGING_DATA;

        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(process.env.NEXT_PUBLIC_ROOT_URL === 'http://localhost:3000' ? stagingData : data);
        a.download = 'storefindy_template.csv';
        a.click();
    }

    function next() {
        if (step === 2 && !fileName) return;
        if (step === 3 && !allRequiredMapped) return;
        setStep(s => Math.min(4, s + 1));
    }
    function back() {
        setStep(s => Math.max(1, s - 1));
    }

    async function doImport() {
        if (importing) return;
        setImporting(true);
        // Send only the rows that passed client-side validation; the server re-validates anyway.
        const records = evaluated.filter(e => e.status !== 'err').map(e => e.obj);
        const res = await importCSV(locatorId, mode, records);
        setImporting(false);
        if (res?.status === 'success') {
            setResult(res);
            setImported(true);
        } else {
            toast.error(res?.message || 'Import failed. Please try again.');
        }
    }

    function reset() {
        setStep(1);
        setFileName('');
        setHeaders([]);
        setRows([]);
        setMapping({});
        setImported(false);
        setResult(null);
    }

    const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    /* ---------- SUCCESS ---------- */
    if (imported) {
        return (
            <div className={csv.wizard}>
                <Stepper step={5} />
                <div className={csv.successBox}>
                    <div className={csv.successIcon}><LuCircleCheck /></div>
                    <div className={csv.successTitle}>Import Successful!</div>
                    <div className={csv.successSub}>Locations have been saved to <strong>{selectedLocatorName}</strong></div>
                    <div className={csv.successStats}>
                        <div>
                            <div className={csv.successStatVal}>{result?.imported ?? 0}</div>
                            <div className={csv.successStatLabel}>{mode === 'replace' ? 'Imported (replaced)' : 'Imported (new)'}</div>
                        </div>
                        {mode === 'update' && (
                            <div>
                                <div className={csv.successStatVal}>{result?.updated ?? 0}</div>
                                <div className={csv.successStatLabel}>Updated</div>
                            </div>
                        )}
                        <div>
                            <div className={csv.successStatVal}>{result?.skipped ?? 0}</div>
                            <div className={csv.successStatLabel}>Skipped (error)</div>
                        </div>
                    </div>
                    <div className={csv.successActions}>
                        <Button value="View All Locations" icon={<LuList />} primary onClick={() => router.push('/dashboard/locations')} />
                        <Button value="Import Another CSV" icon={<LuCloudUpload />} onClick={reset} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={csv.wizard}>
            <Stepper step={step} />

            {/* Status hover tooltip (fixed so it escapes the scrollable preview table). */}
            {tooltip && (
                <div className={csv.statusTooltip} style={{ top: tooltip.top, left: tooltip.left }}>
                    {tooltip.lines.map((line, i) => (
                        <div key={i} className={csv.statusTooltipLine}>• {line}</div>
                    ))}
                </div>
            )}

            {/* STEP 1 — Select locator + mode */}
            {step === 1 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}>
                        <LuMap /> Select Target Locator
                        <span className={csv.badgeInfo}>1 CSV per locator</span>
                    </div>
                    <p className={csv.cardDesc}>
                        Each CSV is imported into <strong>one specific locator</strong>. All locations from the file will be
                        assigned to the locator you select. If you have multiple locators, import a separate CSV for each.
                    </p>
                    <div className={csv.locatorOptions}>
                        {locators.map(loc => (
                            <div
                                key={loc._id}
                                className={`${csv.locatorOpt} ${locatorId === loc._id ? csv.selected : ''}`}
                                onClick={() => setLocatorId(loc._id)}
                            >
                                <div className={csv.locatorOptIcon}><LuMap /></div>
                                <div className={csv.locatorOptName}>{loc.name}</div>
                                <div className={csv.locatorOptMeta}>{loc.default_country?.toUpperCase() || 'Locator'}</div>
                                <div className={csv.locatorOptCheck}>{locatorId === loc._id && <LuCheck />}</div>
                            </div>
                        ))}
                    </div>
                    <div className={csv.importMode}>
                        {IMPORT_MODES.map(m => (
                            <div
                                key={m.id}
                                className={`${csv.modeOpt} ${mode === m.id ? csv.selected : ''}`}
                                onClick={() => setMode(m.id)}
                            >
                                <div className={csv.modeOptTitle}>{m.icon} {m.title}</div>
                                <div className={csv.modeOptDesc}>{m.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2 — Upload */}
            {step === 2 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}><LuFileSpreadsheet /> Upload Your CSV File</div>
                    <div className={csv.templateBox}>
                        <div className={csv.templateIcon}><LuDownload /></div>
                        <div className={csv.templateInfo}>
                            <div className={csv.templateName}>Download CSV Template</div>
                            <div className={csv.templateDesc}>Pre-formatted with all required and optional columns — open in Excel or Google Sheets.</div>
                        </div>
                        <button type="button" className={csv.templateBtn} onClick={downloadTemplate}>
                            <LuDownload /> Download Template
                        </button>
                    </div>
                    <div
                        className={`${csv.uploadZone} ${dragging ? csv.drag : ''} ${fileName ? csv.hasFile : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        {fileName ? <LuFileCheck className={csv.uploadIcon} /> : <LuCloudUpload className={csv.uploadIcon} />}
                        <div className={csv.uploadTitle}>{fileName || 'Drag & drop your CSV here'}</div>
                        <div className={csv.uploadSub}>
                            {fileName
                                ? `${rows.length} rows detected · ${headers.length} columns found · ${fmtSize(fileSize)}`
                                : 'or click to browse · Max 5MB · .csv files only'}
                        </div>
                        {fileName && (
                            <div>
                                <span className={csv.uploadBadge}><LuCircleCheck /> File ready to process</span>
                            </div>
                        )}
                    </div>
                    <div className={csv.columnsGrid}>
                        <div className={`${csv.colBox} ${csv.required}`}>
                            <div className={csv.colBoxTitle}><LuAsterisk /> Required Columns</div>
                            {REQUIRED_FIELDS.map(f => (
                                <div key={f} className={csv.colItem}>
                                    <span className={csv.colName}>{f}</span>
                                    <span className={csv.colDesc}>{FIELD_LABELS[f]}</span>
                                </div>
                            ))}
                        </div>
                        <div className={`${csv.colBox} ${csv.optional}`}>
                            <div className={csv.colBoxTitle}><LuCircleDashed /> Optional Columns</div>
                            {OPTIONAL_FIELDS.map(f => (
                                <div key={f} className={csv.colItem}>
                                    <span className={csv.colName}>{f}</span>
                                    <span className={csv.colDesc}>{FIELD_LABELS[f]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 — Map fields */}
            {step === 3 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}>
                        <LuArrowLeftRight /> Map CSV Columns to Storefindy Fields
                        <span className={csv.badgeInfo}>Auto-matched where possible</span>
                    </div>
                    <p className={csv.cardDesc}>
                        We detected your CSV columns below. Match each to the correct Storefindy field. All{' '}
                        <span className={csv.reqHl}>required</span> fields must be mapped before proceeding.
                    </p>
                    <table className={csv.mappingTable}>
                        <thead>
                            <tr>
                                <th>Your CSV Column</th>
                                <th>Sample Data</th>
                                <th style={{ width: 24 }}></th>
                                <th>Storefindy Field</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {headers.map((h, i) => {
                                const field = mapping[h] || '';
                                const isReq = REQUIRED_FIELDS.includes(field);
                                const isOpt = OPTIONAL_FIELDS.includes(field);
                                return (
                                    <tr key={h + i}>
                                        <td><span className={csv.csvColBadge}>{h}</span></td>
                                        <td><span className={csv.mapPreview}>{rows[0]?.[i] || '—'}</span></td>
                                        <td className={csv.mapArrow}><LuArrowRight /></td>
                                        <td>
                                            <select
                                                className={`${csv.mapSelect} ${field ? csv.matched : ''}`}
                                                value={field}
                                                onChange={(e) => setMapping(m => ({ ...m, [h]: e.target.value }))}
                                            >
                                                <option value="">{SKIP}</option>
                                                {SF_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            {isReq ? <span className={csv.mapBadgeReq}>Required</span>
                                                : isOpt ? <span className={csv.mapBadgeOpt}>Optional</span>
                                                    : <span className={csv.mapBadgeOpt}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* STEP 4 — Preview */}
            {step === 4 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}><LuTable /> Preview Import Data</div>
                    <div className={csv.previewHeader}>
                        <div className={csv.previewStats}>
                            <div className={`${csv.previewStat} ${csv.ok}`}><LuCircleCheck /> {counts.ok} ready</div>
                            <div className={`${csv.previewStat} ${csv.warn}`}><LuTriangleAlert /> {counts.warn} warning</div>
                            <div className={`${csv.previewStat} ${csv.err}`}><LuCircleX /> {counts.err} error</div>
                        </div>
                        <span className={csv.previewCount}>
                            Showing first {Math.min(10, rows.length)} rows · {rows.length} total
                        </span>
                    </div>
                    <div className={csv.previewScroll}>
                        <table className={csv.previewTable}>
                            <thead>
                                <tr>
                                    <th>#</th><th>Status</th>
                                    {SF_FIELDS.map(f => <th key={f}>{f}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {evaluated.slice(0, 10).map(({ obj, status, countryRaw, countryUnmatched, issues }, i) => (
                                    <tr key={i} className={status === 'ok' ? csv.rowOk : status === 'warn' ? csv.rowWarn : csv.rowErr}>
                                        <td className={csv.rowIndex}>{i + 1}</td>
                                        <td>
                                            <span
                                                className={`${csv.rowBadge} ${csv[status]}`}
                                                style={issues.length ? { cursor: 'help' } : undefined}
                                                onMouseEnter={issues.length ? (e) => showTooltip(e, issues) : undefined}
                                                onMouseLeave={issues.length ? () => setTooltip(null) : undefined}
                                            >
                                                {status === 'ok' ? <><LuCircleCheck /> Ready</> : status === 'warn' ? <><LuTriangleAlert /> Warning</> : <><LuCircleX /> Error</>}
                                            </span>
                                        </td>
                                        {SF_FIELDS.map(f => {
                                            const v = obj[f];
                                            const invalid = (f === 'lat' || f === 'lng') && v && isNaN(Number(v));
                                            const countryWarn = f === 'country' && countryUnmatched;
                                            const cls = invalid ? csv.cellInvalid
                                                : countryWarn ? csv.cellInvalid
                                                    : !v ? csv.cellEmpty
                                                        : f === 'website' ? csv.cellLink
                                                            : f === 'name' ? csv.rowName
                                                                : csv.cellMuted;
                                            // Country is stored as a code but shown as its label in the preview.
                                            // Unmatched countries show the original value struck out, then the default.
                                            if (f === 'country') {
                                                return (
                                                    <td
                                                        key={f}
                                                        className={cls}
                                                        title={countryWarn ? `"${countryRaw}" didn't match any country in our list — saving as "${CODE_TO_LABEL.get(DEFAULT_COUNTRY)}"` : undefined}
                                                    >
                                                        {!v ? '—' : countryWarn ? (
                                                            <>
                                                                <LuTriangleAlert />{' '}
                                                                <s>{countryRaw}</s>{' '}
                                                                <span className={csv.rowName}>{CODE_TO_LABEL.get(v) || v}</span>
                                                            </>
                                                        ) : (CODE_TO_LABEL.get(v) || v)}
                                                    </td>
                                                );
                                            }
                                            return <td key={f} className={cls}>{v || '—'}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(counts.err > 0 || counts.warn > 0) && (
                        <div className={csv.notesBox}>
                            <div className={csv.notesBoxTitle}><LuCircleAlert /> Import Notes</div>
                            <p>
                                {counts.err > 0 && <>• <strong>{counts.err}</strong> row(s) have missing required fields or an invalid latitude/longitude — they will be <strong>skipped</strong>.<br /></>}
                                {counts.countryUnmatched > 0 && <>• <strong>{counts.countryUnmatched}</strong> row(s) have a country that doesn&apos;t match our country list — they will default to <strong>{CODE_TO_LABEL.get(DEFAULT_COUNTRY)}</strong>. Use the full country name (e.g. <em>Philippines</em>) or its 2-letter code (e.g. <em>ph</em>).<br /></>}
                                {counts.warn > 0 && <>• <strong>{counts.warn}</strong> row(s) are missing optional fields or have an unmatched country — they will still be <strong>imported</strong>.<br /></>}
                                • <strong>{validRows} valid row(s)</strong> will be added to <strong>{selectedLocatorName}</strong>.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* BOTTOM BAR */}
            <div className={csv.bottomBar}>
                <div className={csv.bottomHint}>Step {step} of 4 — {STEP_HINTS[step - 1]}</div>
                <div className={csv.bottomRight}>
                    {step > 1 && <Button value="Back" icon={<LuArrowLeft />} onClick={back} />}
                    {step < 4 ? (
                        <Button
                            value={step === 3 ? 'Preview' : 'Next'}
                            icon={step === 3 ? <LuEye /> : <LuArrowRight />}
                            iconPosition="right"
                            primary
                            disabled={(step === 2 && !fileName) || (step === 3 && !allRequiredMapped)}
                            onClick={next}
                        />
                    ) : (
                        <Button
                            value={`Import ${validRows} Location${validRows === 1 ? '' : 's'}`}
                            icon={<LuCloudUpload />}
                            primary
                            disabled={validRows === 0}
                            pending={importing}
                            onClick={doImport}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ImportCSVPageClient() {

    const [locators, setLocators] = useState(null);

    useEffect(() => {
        getLocators().then(setLocators);
    }, []);

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Import CSV</h1>
                    <p>Dashboard <RiArrowRightLine /> Locations <RiArrowRightLine /> All Locations <RiArrowRightLine /> Import CSV</p>
                </div>
                <div className={styles.body}>
                    {
                        locators === null ? null
                            : locators.length === 0 ? (
                                <LimitReached
                                    msg="You don't have any locators yet. Please create a locator first."
                                    href="/dashboard/locators/create"
                                    buttonText={<><LuPlus /> Create Locator</>}
                                />
                            ) : <ImportWizard locators={locators} />
                    }
                </div>
            </div>
        </div>
    );
}
