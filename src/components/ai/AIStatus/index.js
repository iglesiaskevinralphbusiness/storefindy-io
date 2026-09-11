'use client';
// The pieces every AI panel needs: a progress bar that knows the difference
// between "downloading the model" and "working", a message row, and the notice
// shown on a device that can't run AI at all.
//
// Kept together in one file because they are only ever used side by side, and
// because the wording has to stay identical across the four panels — a merchant
// should read the same sentence wherever they first meet it.
//
// NOTE ON WORDING: none of this copy says that the AI runs on the merchant's
// own machine, and it shouldn't. That is an implementation detail the product
// deliberately doesn't surface, so the strings here talk about AI being "set
// up", "ready" or "unavailable" and never about browsers, devices or
// downloads. The developer-facing explanation lives in src/lib/ai/models.js.
import { LuInfo, LuTriangleAlert, LuSparkles } from 'react-icons/lu';
import styles from '../AI.module.scss';

/** What each job stage is called in the progress row. */
const STAGE_LABELS = {
    model: 'Getting AI ready',
    download: 'Getting AI ready',
    embed: 'Reading your text',
    match: 'Matching to supported values',
    clean: 'Cleaning rows',
    search: 'Searching the documentation',
};

/**
 * Progress for a running AI job.
 *
 * @param {{stage: string, loaded: number, total: number, percent: number}|null} progress
 * @param {string} [label] Overrides the stage label.
 */
export function AIProgress({ progress, label }) {
    if (!progress) return null;

    const percent = Number.isFinite(progress.percent) ? progress.percent : 0;
    // A download served without a Content-Length reports no total. Showing a
    // bar stuck at 0% reads as "broken", so it slides instead.
    const indeterminate = percent === 0 && !progress.total;

    return (
        <div className={styles.progress}>
            <div className={styles.progressHead}>
                <span>{label ?? STAGE_LABELS[progress.stage] ?? 'Working'}</span>
                {!indeterminate && <span>{percent}%</span>}
            </div>
            <div className={styles.progressTrack}>
                <div
                    className={`${styles.progressBar} ${indeterminate ? styles.indeterminate : ''}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

/** A neutral, warning or error message under a panel. */
export function AIMessage({ tone = 'note', children }) {
    if (!children) return null;
    return <div className={styles[tone] ?? styles.note}>{children}</div>;
}

/**
 * Shown in place of a panel when the browser can't run the model.
 *
 * The wording deliberately points at what still works: every AI feature here is
 * an optional layer over a manual control that is right there on the page.
 */
export function AIUnavailable({ reason, fallback }) {
    return (
        <div className={styles.unsupported}>
            <LuInfo />
            <div>
                <strong>{reason}</strong>
                {fallback ? <> {fallback}</> : null}
            </div>
        </div>
    );
}

/** Panel header with the shared AI mark. */
export function AIPanelHead({ title, icon }) {
    return (
        <div className={styles.head}>
            {icon ?? <LuSparkles />}
            <span>{title}</span>
        </div>
    );
}

/**
 * The first-run notice.
 *
 * Setting up costs a few seconds the first time and is near-instant after
 * that, which is worth saying so the wait doesn't read as a hang. It
 * deliberately doesn't describe how or where that setup happens.
 */
export function AIFirstRunNote() {
    return (
        <div className={styles.note}>
            <LuTriangleAlert style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Setting up AI for the first time — this takes a few seconds. It is much
            faster every time after this.
        </div>
    );
}

export default AIProgress;
