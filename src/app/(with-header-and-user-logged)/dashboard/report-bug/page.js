'use client';
import { useEffect, useRef, useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import Input from '@/components/Forms/Input';
import Select from '@/components/Forms/Select';
import Textarea from '@/components/Forms/Textarea';
import Button from '@/components/Forms/Button';
import { submitBugReport, getReportBugContext } from '@/actions/report-bug';
import { RiArrowRightLine } from "react-icons/ri";
import {
    TbFileDescription,
    TbListNumbers,
    TbScreenshot,
    TbDeviceLaptop,
    TbHistory,
    TbCloudUpload,
    TbPlus,
    TbX,
    TbSend,
    TbCircleCheck,
    TbHome,
    TbFileAlert,
} from 'react-icons/tb';

const MAX_STEPS = 8;
const MAX_SCREENSHOTS = 5;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const SEVERITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];

const FEATURE_OPTIONS = [
    { code: '', label: '— Select feature —' },
    ...[
        'Store Locator Widget',
        'Map Display',
        'CSV Import',
        'Customize UI',
        'Embed Code',
        'All Locations',
        'Add Location',
        'Dashboard',
        'Billing',
        'Profile / Account',
        'Analytics',
        'Login / Registration',
    ].map((f) => ({ code: f, label: f })),
];

const FREQUENCY_OPTIONS = [
    { code: 'always', label: 'Always (every time)' },
    { code: 'sometimes', label: 'Sometimes (intermittent)' },
    { code: 'rarely', label: 'Rarely (happened once)' },
];

function detectSystemInfo() {
    if (typeof navigator === 'undefined') return { browser: '', os: '', screen: '', ua: '' };
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';

    const screen = typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : '';
    return { browser, os, screen, ua };
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReportBugPage() {
    const formRef = useRef(null);
    const router = useRouter();
    const [state, action, pending] = useActionState(submitBugReport, { status: "idle" });

    const [subject, setSubject] = useState('');
    const [affectedFeature, setAffectedFeature] = useState('');
    const [frequency, setFrequency] = useState('always');
    const [description, setDescription] = useState('');
    const [expectedBehavior, setExpectedBehavior] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [steps, setSteps] = useState(['', '', '']);
    const [screenshots, setScreenshots] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [sysInfo, setSysInfo] = useState({ browser: 'Detecting…', os: 'Detecting…', screen: 'Detecting…', ua: '' });
    const [ctx, setCtx] = useState({ userId: '', email: '', planName: '', appVersion: '', previousReports: [] });
    const [dismissed, setDismissed] = useState(false);

    // Auto-detect system info + load account context / previous reports.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only APIs on mount
        setSysInfo(detectSystemInfo());
        getReportBugContext()
            .then((data) => setCtx(data))
            .catch(() => { /* non-blocking */ });
    }, []);

    useEffect(() => {
        if (state.status === "success") {
            toast.success("Bug reported", { description: state.message });
        } else if (state.status === "error") {
            toast.warning("Some fields are not valid", { description: Object.values(state.errors)[0] });
        } else if (state.status === "fatal") {
            toast.error("Something went wrong", { description: state.message });
        }
    }, [state]);

    const errors = state.status === "error" ? state.errors : {};
    const reference = state.status === "success" ? (state.reference || '') : '';
    const showSuccess = state.status === "success" && !pending && !dismissed;

    const resetForm = () => {
        formRef.current?.reset();
        setSubject('');
        setAffectedFeature('');
        setFrequency('always');
        setDescription('');
        setExpectedBehavior('');
        setSeverity('medium');
        setSteps(['', '', '']);
        setScreenshots([]);
        setDismissed(true);
    };

    const updateStep = (i, value) => {
        setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));
    };
    const addStep = () => {
        if (steps.length >= MAX_STEPS) {
            toast.warning(`Maximum ${MAX_STEPS} steps allowed`);
            return;
        }
        setSteps((prev) => [...prev, '']);
    };
    const removeStep = (i) => {
        if (steps.length <= 1) return;
        setSteps((prev) => prev.filter((_, idx) => idx !== i));
    };

    const handleFiles = (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const room = MAX_SCREENSHOTS - screenshots.length;
        if (room <= 0) {
            toast.warning(`Maximum ${MAX_SCREENSHOTS} screenshots allowed`);
            return;
        }
        files.slice(0, room).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            if (file.size > MAX_SCREENSHOT_BYTES) {
                toast.warning('Each screenshot must be 5MB or smaller', { description: file.name });
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => setScreenshots((prev) => (prev.length >= MAX_SCREENSHOTS ? prev : [...prev, e.target.result]));
            reader.readAsDataURL(file);
        });
    };
    const removeScreenshot = (i) => setScreenshots((prev) => prev.filter((_, idx) => idx !== i));

    const renderCrumb = (
        <div className={styles.title}>
            <h1>Report a Bug</h1>
            <p>Dashboard <RiArrowRightLine /> Support <RiArrowRightLine /> Report Bug</p>
        </div>
    );

    if (showSuccess) {
        return (
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    {renderCrumb}
                    <div className={styles.body}>
                        <div className={styles.report}>
                            <div className={styles.reportCard}>
                                <div className={styles.successState}>
                                    <div className={styles.successIcon}><TbCircleCheck /></div>
                                    <div className={styles.successTitle}>Bug report submitted successfully!</div>
                                    <p className={styles.successSub}>
                                        Thanks for helping us improve Storefindy. Our team reviews reports within 24–48 hours.
                                        Critical bugs are prioritized and may be addressed sooner.
                                    </p>
                                    {reference && <div className={styles.successRef}>{reference}</div>}
                                    {ctx.email && (
                                        <p className={styles.successSub} style={{ marginBottom: 0 }}>
                                            A confirmation has been sent to <strong>{ctx.email}</strong>
                                        </p>
                                    )}
                                    <div style={{ height: 16 }} />
                                    <div className={styles.successActions}>
                                        <Button type="button" value="Report another bug" icon={<TbPlus />} primary onClick={resetForm} />
                                        <Button type="button" value="Back to Dashboard" icon={<TbHome />} onClick={() => router.push('/dashboard')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                {renderCrumb}
                <div className={styles.body}>
                    <form ref={formRef} action={action} className={styles.report} onSubmit={() => setDismissed(false)}>
                        {/* Hidden data carriers for non-text controls */}
                        <input type="hidden" name="severity" value={severity} />
                        <input type="hidden" name="screenshots_json" value={JSON.stringify(screenshots)} />
                        <input type="hidden" name="sys_browser" value={sysInfo.browser} />
                        <input type="hidden" name="sys_os" value={sysInfo.os} />
                        <input type="hidden" name="sys_screen" value={sysInfo.screen} />
                        <input type="hidden" name="sys_ua" value={sysInfo.ua} />
                        <input type="hidden" name="sys_plan" value={ctx.planName} />

                        {/* BUG DETAILS */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportCardTitle}>
                                <TbFileDescription /> Bug Details
                            </div>

                            <div className={styles.reportGroup}>
                                <Input
                                    label="Bug Title"
                                    type="text"
                                    name="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                                    maxlength={100}
                                    placeholder="Short summary e.g. Map pins not showing on mobile"
                                    required
                                    note={`${subject.length} / 100`}
                                    error={errors.subject}
                                />
                            </div>

                            <div className={styles.reportGroup}>
                                <label className={styles.reportLabel}>Severity <span className="req">*</span></label>
                                <div className={styles.severityOptions}>
                                    {SEVERITIES.map((s) => (
                                        <div
                                            key={s.value}
                                            className={`${styles.severityOpt} ${styles[s.value]} ${severity === s.value ? styles.selected : ''}`}
                                            onClick={() => setSeverity(s.value)}
                                            role="button"
                                        >
                                            <span className={styles.severityDot} />
                                            <span className={styles.severityText}>{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className={styles.reportHint}>
                                    Low — minor inconvenience · Medium — affects workflow · High — major feature broken · Critical — complete outage
                                </p>
                            </div>

                            <div className={`${styles.reportGroup} ${styles.reportTwoCol}`}>
                                <Select
                                    label="Affected Feature"
                                    name="affected_feature"
                                    value={affectedFeature}
                                    onChange={(e) => setAffectedFeature(e.target.value)}
                                    options={FEATURE_OPTIONS}
                                    required
                                    error={errors.affected_feature}
                                />
                                <Select
                                    label="How often does this happen?"
                                    name="frequency"
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    options={FREQUENCY_OPTIONS}
                                />
                            </div>

                            <div className={styles.reportGroup}>
                                <Textarea
                                    label="Description"
                                    name="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                                    placeholder="Describe what happened in detail. What were you doing? What did you expect? What actually happened?"
                                    required
                                    note={`${description.length} / 1000`}
                                />
                                {errors.description && <p className={styles.reportError}>{errors.description}</p>}
                            </div>

                            <div className={styles.reportGroup}>
                                <Textarea
                                    label="Expected Behavior (optional)"
                                    name="expected_behavior"
                                    value={expectedBehavior}
                                    onChange={(e) => setExpectedBehavior(e.target.value.slice(0, 1000))}
                                    placeholder="What should have happened instead?"
                                />
                                {errors.expected_behavior && <p className={styles.reportError}>{errors.expected_behavior}</p>}
                            </div>
                        </div>

                        {/* STEPS TO REPRODUCE */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportCardTitle}>
                                <TbListNumbers /> Steps to Reproduce
                                <span className={styles.reportBadge}>Optional but helpful</span>
                            </div>
                            <div className={styles.stepsList}>
                                {steps.map((step, i) => (
                                    <div key={i} className={styles.stepRow}>
                                        <div className={styles.stepNum}>{i + 1}</div>
                                        <input
                                            name="steps"
                                            type="text"
                                            className={styles.stepInput}
                                            placeholder={i === 0 ? 'e.g. Go to the All Locators page' : 'Add another step…'}
                                            value={step}
                                            onChange={(e) => updateStep(i, e.target.value)}
                                            maxLength={200}
                                        />
                                        <button type="button" className={styles.stepRemove} onClick={() => removeStep(i)} aria-label="Remove step">
                                            <TbX />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" value="Add step" icon={<TbPlus />} onClick={addStep} />
                        </div>

                        {/* SCREENSHOTS */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportCardTitle}>
                                <TbScreenshot /> Screenshots
                                <span className={styles.reportBadge}>Optional</span>
                            </div>
                            <div
                                className={`${styles.screenshotZone} ${dragging ? styles.drag : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                            >
                                <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
                                <TbCloudUpload />
                                <p>Drag &amp; drop screenshots here or click to browse</p>
                                <span>PNG, JPG, GIF · Max 5MB per file · Up to {MAX_SCREENSHOTS} files</span>
                            </div>
                            {screenshots.length > 0 && (
                                <div className={styles.screenshotsPreview}>
                                    {screenshots.map((src, i) => (
                                        <div key={i} className={styles.screenshotThumb}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt={`Screenshot ${i + 1}`} />
                                            <button type="button" className={styles.removeThumb} onClick={() => removeScreenshot(i)} aria-label="Remove screenshot">
                                                <TbX />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.screenshots && <p className={styles.reportError}>{errors.screenshots}</p>}
                            <p className={styles.reportHint}>Screenshots help us identify and fix the bug faster.</p>
                        </div>

                        {/* SYSTEM INFO */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportCardTitle}>
                                <TbDeviceLaptop /> System Information
                                <span className={styles.reportBadge}>Auto-detected</span>
                            </div>
                            <div className={styles.sysGrid}>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>Browser</div>
                                    <div className={styles.sysVal}>{sysInfo.browser}</div>
                                </div>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>Operating System</div>
                                    <div className={styles.sysVal}>{sysInfo.os}</div>
                                </div>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>Screen Resolution</div>
                                    <div className={styles.sysVal}>{sysInfo.screen}</div>
                                </div>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>Account Plan</div>
                                    <div className={styles.sysVal}>{ctx.planName || '—'}</div>
                                </div>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>User ID</div>
                                    <div className={`${styles.sysVal} ${styles.mono}`}>{ctx.userId || '—'}</div>
                                </div>
                                <div className={styles.sysItem}>
                                    <div className={styles.sysLabel}>App Version</div>
                                    <div className={styles.sysVal}>{ctx.appVersion || '—'}</div>
                                </div>
                            </div>
                            <p className={styles.reportHint}>This information is automatically included with your report to help us debug faster.</p>
                        </div>

                        {/* PREVIOUS REPORTS */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportCardTitle}>
                                <TbHistory /> Your Previous Reports
                            </div>
                            {ctx.previousReports.length === 0 ? (
                                <p className={styles.prevEmpty}>You haven&apos;t submitted any bug reports yet.</p>
                            ) : (
                                ctx.previousReports.map((r) => (
                                    <div key={r.id} className={styles.prevReport}>
                                        <div className={styles.prevIcon}><TbFileAlert /></div>
                                        <div className={styles.prevInfo}>
                                            <div className={styles.prevTitle}>{r.subject}</div>
                                            <div className={styles.prevMeta}>
                                                {r.reference && <span>{r.reference}</span>}
                                                {r.reference && <span>·</span>}
                                                <span>{formatDate(r.created_at)}</span>
                                                <span>·</span>
                                                <span className={`${styles.prevStatus} ${styles[r.status] || styles.open}`}>
                                                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className={styles.reportCard}>
                            <div className={styles.reportActions}>
                                <span className={styles.reportHintInline}>
                                    All reports are reviewed within 24–48 hours. Critical bugs are prioritized.
                                </span>
                                <div className={styles.reportBtns}>
                                    <Button type="button" value="Clear form" icon={<TbX />} onClick={resetForm} />
                                    <Button type="submit" value="Submit Report" icon={<TbSend />} primary pending={pending} />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
