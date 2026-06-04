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
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(data);
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

export default function ImportCSVPage() {

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
                                <div className="empty">
                                    <p>You don&apos;t have any locators yet. Please create a locator first.</p>
                                    <Link href="/dashboard/locators/create"><Button value="Create Locator" icon={<LuPlus />} primary={true} /></Link>
                                </div>
                            ) : <ImportWizard locators={locators} />
                    }
                </div>
            </div>
        </div>
    );
}
