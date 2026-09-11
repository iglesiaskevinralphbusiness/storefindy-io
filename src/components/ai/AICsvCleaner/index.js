'use client';
// The AI panels inside the CSV import wizard.
//
//   AIMappingSuggest — step 3. Suggests a Storefindy field for the columns the
//                      wizard's exact-synonym matching didn't recognise.
//   AICsvCleaner     — step 4. Cleans the mapped rows and shows every cell it
//                      wants to change before any of it is applied.
//
// Both are proposals. Nothing here writes to the database, and nothing is
// applied until the merchant presses the button that says so — at which point
// it lands in the wizard's own preview, where the existing per-row validation
// re-runs over it exactly as it does over a hand-written file.
import { useCallback, useMemo, useRef, useState } from 'react';
import { LuSparkles, LuX, LuWandSparkles, LuUndo2, LuArrowRight } from 'react-icons/lu';
import Button from '@/components/Forms/Button';
import styles from '../AI.module.scss';
import { AIProgress, AIMessage, AIUnavailable, AIPanelHead, AIFirstRunNote } from '../AIStatus';
import { useAiSupport } from '@/lib/ai/use-ai-support';
import { cleanCsvRows, suggestFieldMapping, cleanerFieldLabel } from '@/lib/ai/csv-cleaner';

/** How many individual cell changes the list shows before it stops. */
const MAX_LISTED = 60;

/* --------------------------------------------------------------------- *
 * Step 3 — column mapping suggestions
 * ------------------------------------------------------------------ */

/**
 * @param {object} props
 * @param {string[]} props.unmappedHeaders CSV headers still set to "skip".
 * @param {Array<{field: string, label: string}>} props.availableFields Fields not already taken.
 * @param {(suggestions: Record<string, string>) => void} props.onApply
 */
export function AIMappingSuggest({ unmappedHeaders, availableFields, onApply }) {
    const support = useAiSupport();
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState(null);
    const abortRef = useRef(null);

    const run = async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError('');
        setProgress({ stage: 'model', loaded: 0, total: 0, percent: 0 });

        try {
            const result = await suggestFieldMapping(unmappedHeaders, availableFields, {
                signal: controller.signal,
                onProgress: setProgress,
            });
            setSuggestions(result);
        } catch (caught) {
            if (caught?.name !== 'AbortError') {
                setError(caught?.message || 'AI is unavailable right now. Map the columns using the dropdowns below.');
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    };

    if (!support?.supported || unmappedHeaders.length === 0) return null;

    const entries = suggestions ? Object.entries(suggestions) : [];
    const labelFor = (field) => availableFields.find((entry) => entry.field === field)?.label ?? field;

    return (
        <div className={styles.panel}>
            <AIPanelHead title="Match the remaining columns with AI" />
            <p className={styles.desc}>
                {unmappedHeaders.length} column{unmappedHeaders.length === 1 ? ' is' : 's are'} still
                unmatched. AI can suggest a field for each by reading the column name —
                you can change any suggestion afterwards.
            </p>

            <div className={styles.actions}>
                <Button
                    value={busy ? 'Reading columns…' : 'Suggest matches'}
                    icon={<LuSparkles />}
                    primary
                    disabled={busy}
                    onClick={run}
                />
                {busy && (
                    <Button value="Cancel" icon={<LuX />} onClick={() => { abortRef.current?.abort(); setBusy(false); setProgress(null); }} />
                )}
            </div>

            <AIProgress progress={progress} />
            {busy && progress?.stage === 'model' && <AIFirstRunNote />}
            <AIMessage tone="error">{error}</AIMessage>

            {suggestions && (
                entries.length === 0 ? (
                    <AIMessage tone="warning">
                        None of the remaining columns matched a Storefindy field confidently enough to suggest.
                        Map them with the dropdowns below, or leave them skipped.
                    </AIMessage>
                ) : (
                    <>
                        <div className={styles.changes}>
                            <div className={styles.changesHead}>
                                <LuSparkles />
                                <span>Suggested matches</span>
                                <span className={styles.changesCount}>{entries.length}</span>
                            </div>
                            <div className={styles.changeList}>
                                {entries.map(([header, suggestion]) => (
                                    <div className={styles.change} key={header}>
                                        <span className={styles.changeBody}>
                                            <span className={styles.changeLabel}>{header}</span>
                                            <span className={styles.changeValues}>
                                                <LuArrowRight aria-hidden="true" />
                                                <span className={styles.to}>{labelFor(suggestion.field)}</span>
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <Button
                                value="Use these matches"
                                icon={<LuSparkles />}
                                primary
                                onClick={() => {
                                    onApply(Object.fromEntries(entries.map(([header, suggestion]) => [header, suggestion.field])));
                                    setSuggestions(null);
                                }}
                            />
                            <Button value="Discard" icon={<LuX />} onClick={() => setSuggestions(null)} />
                        </div>
                    </>
                )
            )}
        </div>
    );
}

/* --------------------------------------------------------------------- *
 * Step 4 — row clean-up
 * ------------------------------------------------------------------ */

/**
 * @param {object} props
 * @param {Array<object>} props.rows Mapped rows, including the free-text hours
 *   column if one was mapped.
 * @param {string[]} props.allowedFilters The target locator's filter list.
 * @param {(rows: Array<object>) => void} props.onApply Receives the cleaned rows.
 * @param {() => void} props.onRevert Puts the original rows back.
 * @param {boolean} props.applied Whether a clean-up is currently in effect.
 */
export default function AICsvCleaner({ rows, allowedFilters, onApply, onRevert, applied }) {
    const support = useAiSupport();
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const abortRef = useRef(null);

    // Flattened for the list: one entry per changed cell, carrying its row.
    const listed = useMemo(() => {
        if (!result) return [];
        const out = [];
        for (const proposal of result.proposals) {
            for (const change of proposal.changes) {
                out.push({ ...change, row: proposal.row + 1 });
                if (out.length >= MAX_LISTED) return out;
            }
        }
        return out;
    }, [result]);

    const run = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError('');
        setResult(null);
        setProgress({ stage: 'model', loaded: 0, total: rows.length, percent: 0 });

        try {
            const cleaned = await cleanCsvRows(rows, {
                allowedFilters,
                signal: controller.signal,
                onProgress: setProgress,
            });
            setResult(cleaned);
        } catch (caught) {
            if (caught?.name !== 'AbortError') {
                setError(caught?.message || 'The clean-up could not finish. Your rows are unchanged.');
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }, [rows, allowedFilters]);

    const cancel = () => {
        abortRef.current?.abort();
        setBusy(false);
        setProgress(null);
    };

    if (support === null) return null;

    if (!support.supported) {
        return (
            <AIUnavailable
                reason={support.reason}
                fallback="Your file will import exactly as it always has — fix any flagged cells in the CSV itself."
            />
        );
    }

    const stats = result?.stats;

    return (
        <div className={styles.panel}>
            <AIPanelHead title="Clean this file with AI" icon={<LuWandSparkles />} />
            <p className={styles.desc}>
                Tidies formatting, expands a free-text opening-hours column into the seven day
                columns, and matches your wording to values this locator actually has.
                It never invents a missing value — you see every change before it is applied.
            </p>

            <div className={styles.actions}>
                <Button
                    value={busy ? 'Cleaning…' : `Clean ${rows.length} row${rows.length === 1 ? '' : 's'}`}
                    icon={<LuSparkles />}
                    primary
                    disabled={busy || rows.length === 0}
                    onClick={run}
                />
                {busy && <Button value="Cancel" icon={<LuX />} onClick={cancel} />}
                {applied && !busy && <Button value="Undo clean-up" icon={<LuUndo2 />} onClick={onRevert} />}
            </div>

            <AIProgress progress={progress} />
            {busy && progress?.stage === 'model' && <AIFirstRunNote />}
            <AIMessage tone="error">{error}</AIMessage>

            {result && (
                stats.cellsChanged === 0 && stats.warnings === 0 ? (
                    <AIMessage tone="note">
                        Nothing to clean — every cell already matches the format the importer expects.
                    </AIMessage>
                ) : (
                    <>
                        <div className={styles.changes}>
                            <div className={styles.changesHead}>
                                <LuSparkles />
                                <span>Proposed changes</span>
                                <span className={styles.changesCount}>
                                    {stats.cellsChanged} cell{stats.cellsChanged === 1 ? '' : 's'} in {stats.rowsChanged} row{stats.rowsChanged === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className={styles.changeList}>
                                {listed.map((change, index) => (
                                    <div className={styles.change} key={`${change.row}-${change.field}-${index}`}>
                                        <span className={styles.changeBody}>
                                            <span className={styles.changeLabel}>
                                                Row {change.row} · {cleanerFieldLabel(change.field)}
                                            </span>
                                            {change.source === 'warning' ? (
                                                <span className={styles.changeNote}>{change.note}</span>
                                            ) : (
                                                <>
                                                    <span className={styles.changeValues}>
                                                        <span className={styles.from}>{change.from || '(empty)'}</span>
                                                        <span aria-hidden="true">&rarr;</span>
                                                        <span className={styles.to}>{change.to || '(empty)'}</span>
                                                    </span>
                                                    {change.note ? <span className={styles.changeNote}>{change.note}</span> : null}
                                                </>
                                            )}
                                        </span>
                                        {change.source === 'ai' ? <span className={styles.changeSource}>matched</span> : null}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {result.proposals.reduce((sum, proposal) => sum + proposal.changes.length, 0) > listed.length && (
                            <AIMessage tone="note">
                                Showing the first {listed.length} changes. The rest follow the same rules and are
                                applied together.
                            </AIMessage>
                        )}

                        {stats.semanticFailed && (
                            <AIMessage tone="warning">
                                Formatting was cleaned up, but AI was unavailable — so your wording
                                was not matched against this locator&apos;s own filters, statuses or
                                countries.
                            </AIMessage>
                        )}

                        {stats.warnings > 0 && (
                            <AIMessage tone="warning">
                                {stats.warnings} cell{stats.warnings === 1 ? '' : 's'} need your attention and were
                                left untouched — they are listed above with the reason.
                            </AIMessage>
                        )}

                        {stats.cellsChanged > 0 && (
                            <div className={styles.actions}>
                                <Button
                                    value="Apply to the preview"
                                    icon={<LuSparkles />}
                                    primary
                                    onClick={() => { onApply(result.rows); setResult(null); }}
                                />
                                <Button value="Discard" icon={<LuX />} onClick={() => setResult(null)} />
                            </div>
                        )}
                    </>
                )
            )}

            {applied && !result && (
                <AIMessage tone="note">
                    Clean-up applied. The preview below shows the cleaned data — check it, then import as usual.
                </AIMessage>
            )}
        </div>
    );
}
