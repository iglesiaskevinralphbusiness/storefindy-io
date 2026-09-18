'use client';
import { useEffect, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuPalette } from 'react-icons/lu';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import Button from '@/components/Forms/Button';
import { LOCATOR_COLOR_TEMPLATES } from '@/utils/constant/locator-color-templates';
import { applyConfigChanges } from '@/lib/ai/widget-config';
import styles from './ColorTemplates.module.scss';

/**
 * "Can't decide which color to use?" — the whole-look picker at the foot of the
 * Customize panel.
 *
 * Applying a template is a setState like every other control in the sidebar: it
 * marks the locator dirty and waits for Save Changes. Nothing is written here.
 * The change set runs through applyConfigChanges(), the same function the AI
 * configurator uses, so a template touches exactly the paths it lists and leaves
 * every branch it does not name at its current object identity — which is what
 * keeps the sidebar's unsaved-changes check accurate.
 */
export default function ColorTemplates({ settings, setSettings, features, setFeatures }) {
    const [isOpen, setIsOpen] = useState(false);
    const [index, setIndex] = useState(0);

    const templates = LOCATOR_COLOR_TEMPLATES;
    const count = templates.length;

    // Arrow keys drive the track too — the modal is a carousel, and reaching for
    // the mouse to step through two cards is needless.
    useEffect(() => {
        if (!isOpen || count < 2) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
            if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, count]);

    if (count === 0) return null;

    // Reopening starts at the first template rather than wherever the merchant
    // left the track last time.
    const open = () => {
        setIndex(0);
        setIsOpen(true);
    };

    const goPrevious = () => setIndex((i) => (i - 1 + count) % count);
    const goNext = () => setIndex((i) => (i + 1) % count);

    const applyTemplate = (template) => {
        const changes = Object.entries(template.changes).map(([path, value]) => ({ path, value }));
        const next = applyConfigChanges({ settings, features }, changes);

        setSettings(next.settings);
        setFeatures(next.features);
        setIsOpen(false);
        toast.success(`${template.name} applied. Press Save Changes to keep it.`);
    };

    return (
        <>
            <div className={styles.promo}>
                <p className={styles.promoText}>
                    Can&apos;t decide which color to use? Try our pre-defined color templates.
                </p>
                <Button
                    value="Browse Color Templates"
                    icon={<LuPalette />}
                    onClick={open}
                />
                {/* <div onClick={() => console.log(settings)}>console template settings</div> */}
            </div>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Pre-defined Color Templates"
                wide
            >
                <div className={styles.slider}>
                    <button
                        type="button"
                        className={`${styles.nav} ${styles.navPrevious}`}
                        onClick={goPrevious}
                        disabled={count < 2}
                        aria-label="Previous template"
                    >
                        <LuChevronLeft />
                    </button>

                    <div className={styles.viewport}>
                        <div
                            className={styles.track}
                            style={{ transform: `translateX(-${index * 100}%)` }}
                        >
                            {templates.map((template, position) => (
                                <div
                                    className={styles.slide}
                                    key={template.id}
                                    // Only the card on screen is reachable by tab
                                    // or by a screen reader; the rest are off to
                                    // the side and inert until they slide in.
                                    aria-hidden={position !== index}
                                    inert={position !== index}
                                >
                                    <div className={styles.shot}>
                                        {template.cover_image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={template.cover_image} alt={`${template.name} preview`} />
                                        ) : (
                                            // Until a template's cover image is
                                            // captured, its palette stands in for one.
                                            <div className={styles.palette}>
                                                {template.palette.map((color) => (
                                                    <span
                                                        key={color}
                                                        className={styles.swatch}
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.meta}>
                                        <h3>{template.name}</h3>
                                        {template.description && <p>{template.description}</p>}
                                    </div>

                                    <Button
                                        value="Use this template"
                                        primary
                                        onClick={() => applyTemplate(template)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        className={`${styles.nav} ${styles.navNext}`}
                        onClick={goNext}
                        disabled={count < 2}
                        aria-label="Next template"
                    >
                        <LuChevronRight />
                    </button>
                </div>

                {count > 1 && (
                    <div className={styles.dots}>
                        {templates.map((template, position) => (
                            <button
                                key={template.id}
                                type="button"
                                className={`${styles.dot} ${position === index ? styles.dotActive : ''}`}
                                onClick={() => setIndex(position)}
                                aria-label={`Show ${template.name}`}
                                aria-current={position === index}
                            />
                        ))}
                    </div>
                )}
            </Modal>
        </>
    );
}
