'use client';
import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import { updateProfile, exportMyData, deleteMyAccount } from '@/actions/profile';
import { COUNTRIES, TIMEZONES } from '@/utils/constant';
import {
    TbUserCircle,
    TbId,
    TbCopy,
    TbCheck,
    TbCalendar,
    TbClock,
    TbCrown,
    TbBrandGoogle,
    TbMail,
    TbUser,
    TbBuildingStore,
    TbWorld,
    TbClockHour4,
    TbDeviceFloppy,
    TbAlertTriangle,
    TbDownload,
    TbTrash,
    TbX,
} from 'react-icons/tb';

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfilePageClient({ data }) {
    const {
        id = '',
        email = '',
        first_name = '',
        last_name = '',
        display_name = '',
        company = '',
        country = '',
        timezone = '',
        provider = 'google',
        planName = 'Free',
        created_at = '',
        last_login_at = '',
    } = data || {};

    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [state, action, pending] = useActionState(updateProfile, { status: "idle" });

    useEffect(() => {
        if (state.status === "success") {
            toast.success("Profile updated", { description: state.message });
            router.refresh();
        } else if (state.status === "error") {
            toast.warning("Some fields are not valid", { description: Object.values(state.errors)[0] });
        } else if (state.status === "fatal") {
            toast.error("Something went wrong", { description: state.message });
        }
    }, [state]);

    const handleCopy = () => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await exportMyData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `storefindy-export-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Export ready", { description: "Your data has been downloaded." });
        } catch (e) {
            toast.error("Export failed", { description: "Please try again." });
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        const res = await deleteMyAccount();
        if (res.status === "success") {
            toast.success("Account deleted");
            signOut({ callbackUrl: '/' });
        } else {
            setDeleting(false);
            setConfirmDelete(false);
            toast.error("Delete failed", { description: res.message });
        }
    };

    const accountRows = [
        { icon: <TbId />, label: 'User ID', value: id, copy: true },
        { icon: <TbMail />, label: 'Email', value: email },
        { icon: <TbCalendar />, label: 'Account created', value: formatDate(created_at) },
        { icon: <TbClock />, label: 'Last login', value: formatDate(last_login_at) },
        { icon: <TbCrown />, label: 'Current plan', value: planName },
        { icon: <TbBrandGoogle />, label: 'Auth provider', value: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth` },
    ];

    return (
        <div className={styles.profile}>
            <div className={styles.profileContent}>
                {/* PROFILE INFORMATION — EDITABLE */}
                <form action={action} className={styles.profileCard}>
                    <div className={styles.profileCardTitle}>
                        <TbUserCircle /> Profile information
                    </div>
                    <div className={styles.profileForm}>
                        <div className={styles.profileField}>
                            <label htmlFor="first_name">First name</label>
                            <div className={styles.profileInput}>
                                <TbUser />
                                <input id="first_name" name="first_name" type="text" defaultValue={first_name} placeholder="First name" maxLength={60} />
                            </div>
                        </div>
                        <div className={styles.profileField}>
                            <label htmlFor="last_name">Last name</label>
                            <div className={styles.profileInput}>
                                <TbUser />
                                <input id="last_name" name="last_name" type="text" defaultValue={last_name} placeholder="Last name" maxLength={60} />
                            </div>
                        </div>
                        <div className={styles.profileField}>
                            <label htmlFor="display_name">Display name</label>
                            <div className={styles.profileInput}>
                                <TbUserCircle />
                                <input id="display_name" name="display_name" type="text" defaultValue={display_name} placeholder="How your name appears" maxLength={80} />
                            </div>
                        </div>
                        <div className={styles.profileField}>
                            <label htmlFor="company">Company / Store name</label>
                            <div className={styles.profileInput}>
                                <TbBuildingStore />
                                <input id="company" name="company" type="text" defaultValue={company} placeholder="Your business name" maxLength={120} />
                            </div>
                        </div>
                        <div className={styles.profileField}>
                            <label htmlFor="country">Country</label>
                            <div className={styles.profileInput}>
                                <TbWorld />
                                <select id="country" name="country" defaultValue={country}>
                                    <option value="">Select country</option>
                                    {COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={styles.profileField}>
                            <label htmlFor="timezone">Timezone</label>
                            <div className={styles.profileInput}>
                                <TbClockHour4 />
                                <select id="timezone" name="timezone" defaultValue={timezone}>
                                    <option value="">Select timezone</option>
                                    {TIMEZONES.map((t) => (
                                        <option key={t.code} value={t.code}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className={styles.profileFormActions}>
                        <button type="submit" className={styles.profileSaveBtn} disabled={pending}>
                            <TbDeviceFloppy /> {pending ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>

                {/* ACCOUNT INFORMATION — READ ONLY */}
                <div className={styles.profileCard}>
                    <div className={styles.profileCardTitle}>
                        <TbId /> Account information
                        <span className={styles.profileReadonly}>Read only</span>
                    </div>
                    {accountRows.map((row) => (
                        <div key={row.label} className={styles.profileRow}>
                            <span className={styles.profileKey}>{row.icon} {row.label}</span>
                            <span className={styles.profileVal}>
                                {row.copy ? (
                                    <>
                                        <code className={styles.profileCode}>{row.value}</code>
                                        <button type="button" className={styles.profileCopyBtn} onClick={handleCopy}>
                                            {copied ? <TbCheck /> : <TbCopy />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </>
                                ) : row.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* DANGER ZONE */}
                <div className={styles.dangerCard}>
                    <div className={styles.dangerCardTitle}>
                        <TbAlertTriangle /> Danger zone
                    </div>
                    <div className={styles.dangerRow}>
                        <div className={styles.dangerInfo}>
                            <strong>Export my data</strong>
                            <p>Download all your locators, locations, and account data as a JSON file.</p>
                        </div>
                        <button type="button" className={styles.dangerExportBtn} onClick={handleExport} disabled={exporting}>
                            <TbDownload /> {exporting ? 'Exporting…' : 'Export data'}
                        </button>
                    </div>
                    <div className={styles.dangerRow}>
                        <div className={styles.dangerInfo}>
                            <strong>Delete my account</strong>
                            <p>Permanently delete your account, all locators, locations, and data. This cannot be undone.</p>
                        </div>
                        <button type="button" className={styles.dangerDeleteBtn} onClick={() => setConfirmDelete(true)}>
                            <TbTrash /> Delete account
                        </button>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {confirmDelete && (
                <div className={styles.profileModalOverlay} onClick={() => !deleting && setConfirmDelete(false)}>
                    <div className={styles.profileModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.profileModalHeader}>
                            <span className={styles.profileModalTitle}><TbAlertTriangle /> Delete account</span>
                            <button type="button" className={styles.profileModalClose} onClick={() => !deleting && setConfirmDelete(false)}>
                                <TbX />
                            </button>
                        </div>
                        <div className={styles.profileModalBody}>
                            <p className={styles.profileModalText}>
                                This will permanently delete your account, all locators, locations, and data.
                                <strong> This action cannot be undone.</strong>
                            </p>
                            <div className={styles.profileModalBtns}>
                                <button type="button" className={styles.profileModalCancel} onClick={() => setConfirmDelete(false)} disabled={deleting}>
                                    Cancel
                                </button>
                                <button type="button" className={styles.profileModalConfirm} onClick={handleDelete} disabled={deleting}>
                                    <TbTrash /> {deleting ? 'Deleting…' : 'Delete forever'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
