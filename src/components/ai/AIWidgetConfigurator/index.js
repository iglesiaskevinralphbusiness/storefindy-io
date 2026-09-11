'use client';
// The AI panel at the top of the Customize Locator settings tab.
//
// FLOW
//   merchant describes what they want
//     -> interpretConfigRequest() (embeddings pick the setting, rules read the
//        value, Zod validates it)
//     -> the change list below, every row individually checkable
//     -> Preview: applies the ticked changes to the sidebar's own state, which
//        the live <Locator /> beside it already re-renders from
//     -> Undo puts the previous state back, Save Changes is still the
//        merchant's existing button
//
// Nothing is written to the database from here. "Preview" and "Apply" are the
// same operation — the sidebar state — because the preview in this page is the
// real widget; the only difference is that Undo stays available until the
// merchant moves on.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuSparkles, LuWandSparkles, LuUndo2, LuX } from 'react-icons/lu';
import Button from '@/components/Forms/Button';
import styles from '../AI.module.scss';
import { AIProgress, AIMessage, AIUnavailable, AIPanelHead, AIFirstRunNote } from '../AIStatus';
import { useAiSupport } from '@/lib/ai/use-ai-support';
import {
    interpretConfigRequest,
    applyConfigChanges,
    formatConfigValue,
    settingForPath,
} from '@/lib/ai/widget-config';

const EXAMPLES = [
    'Make my store locator dark',
    'Show opening hours and the directions button',
    'Set the search radius to 25 miles',
    'Use a navy search button and hide the branding',
];

/** A colour swatch beside a hex value, so a change list is readable at a glance. */
function Value({ path, value, className }) {
    const setting = settingForPath(path);
    const isColor = setting?.type === 'color' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    return (
        <span className={className}>
            {isColor ? <span className={styles.swatch} style={{ background: value }} /> : null}
            {formatConfigValue(setting, value)}
        </span>
    );
}

export default function AIWidgetConfigurator({ settings, setSettings, features, setFeatures, user_plan }) {
    const support = useAiSupport();
    const [request, setRequest] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);       // { changes, skipped, unmatched }
    const [accepted, setAccepted] = useState(new Set());
    const [undoState, setUndoState] = useState(null); // { settings, features }
    const abortRef = useRef(null);

    // Abandon an in-flight job if the sidebar unmounts mid-run.
    useEffect(() => () => abortRef.current?.abort(), []);

    // The state the interpreter reasons about — always the live sidebar state,
    // so a second request builds on the first rather than on what was saved.
    const state = useMemo(
        () => ({ settings, features, user_plan }),
        [settings, features, user_plan]
    );

    const run = useCallback(async (text) => {
        const prompt = text.trim();
        if (!prompt || busy) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError('');
        setResult(null);
        setProgress({ stage: 'model', loaded: 0, total: 0, percent: 0 });

        try {
            const interpreted = await interpretConfigRequest(prompt, state, {
                signal: controller.signal,
                onProgress: setProgress,
            });
            setResult(interpreted);
            // Everything understood starts ticked: the merchant is reviewing a
            // proposal, not assembling one from scratch.
            setAccepted(new Set(interpreted.changes.map((change) => change.path)));
        } catch (caught) {
            if (caught?.name !== 'AbortError') {
                setError(caught?.message || 'AI is unavailable right now. You can still change any setting below by hand.');
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }, [busy, state]);

    const cancel = () => {
        abortRef.current?.abort();
        setBusy(false);
        setProgress(null);
    };

    const toggle = (path) => {
        setAccepted((previous) => {
            const next = new Set(previous);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const apply = () => {
        const changes = result.changes.filter((change) => accepted.has(change.path));
        if (changes.length === 0) return;

        // Snapshot before touching anything, so Undo restores exactly the state
        // the merchant had — including edits they made by hand a moment ago.
        setUndoState({ settings, features });

        const next = applyConfigChanges({ settings, features }, changes);
        setSettings(next.settings);
        setFeatures(next.features);
        setResult(null);
        setRequest('');
    };

    const undo = () => {
        if (!undoState) return;
        setSettings(undoState.settings);
        setFeatures(undoState.features);
        setUndoState(null);
    };

    if (support === null) return null;

    if (!support.supported) {
        return (
            <AIUnavailable
                reason={support.reason}
                fallback="Every setting is still available in the panels below."
            />
        );
    }

    const acceptedCount = result ? result.changes.filter((change) => accepted.has(change.path)).length : 0;

    return (
        <div className={styles.panel}>
            <AIPanelHead title="Configure with AI" icon={<LuWandSparkles />} />
            <p className={styles.desc}>
                Describe the look you want. Only the settings you mention are changed —
                everything else stays exactly as you have it.
            </p>

            <div className={styles.prompt}>
                <div className={styles.promptField}>
                    <textarea
                        rows={2}
                        value={request}
                        disabled={busy}
                        placeholder="e.g. Make my store locator dark and show opening hours"
                        onChange={(event) => setRequest(event.target.value)}
                        onKeyDown={(event) => {
                            // Enter submits, Shift+Enter is a newline — the
                            // convention for a one-or-two-line prompt box.
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                run(request);
                            }
                        }}
                    />
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    value={busy ? 'Working…' : 'Suggest changes'}
                    icon={<LuSparkles />}
                    primary
                    disabled={busy || !request.trim()}
                    onClick={() => run(request)}
                />
                {busy && <Button value="Cancel" icon={<LuX />} onClick={cancel} />}
                {undoState && !busy && (
                    <Button value="Undo AI changes" icon={<LuUndo2 />} onClick={undo} />
                )}
            </div>

            {!result && !busy && (
                <div className={styles.examples}>
                    {EXAMPLES.map((example) => (
                        <button
                            key={example}
                            type="button"
                            className={styles.example}
                            onClick={() => { setRequest(example); run(example); }}
                        >
                            {example}
                        </button>
                    ))}
                </div>
            )}

            <AIProgress progress={progress} />
            {busy && progress?.stage === 'model' && <AIFirstRunNote />}
            <AIMessage tone="error">{error}</AIMessage>

            {result && (
                <>
                    {result.changes.length > 0 ? (
                        <div className={styles.changes}>
                            <div className={styles.changesHead}>
                                <LuSparkles />
                                <span>Suggested changes</span>
                                <span className={styles.changesCount}>
                                    {acceptedCount} of {result.changes.length} selected
                                </span>
                            </div>
                            <div className={styles.changeList}>
                                {result.changes.map((change) => (
                                    <label key={change.path} className={styles.change}>
                                        <input
                                            type="checkbox"
                                            className={styles.changeCheck}
                                            checked={accepted.has(change.path)}
                                            onChange={() => toggle(change.path)}
                                        />
                                        <span className={styles.changeBody}>
                                            <span className={styles.changeLabel}>{change.label}</span>
                                            <span className={styles.changeValues}>
                                                <Value path={change.path} value={change.from} className={styles.from} />
                                                <span aria-hidden="true">&rarr;</span>
                                                <Value path={change.path} value={change.value} className={styles.to} />
                                            </span>
                                            {change.note ? <span className={styles.changeNote}>{change.note}</span> : null}
                                        </span>
                                        {change.via ? <span className={styles.changeSource}>{change.via}</span> : null}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <AIMessage tone="warning">
                            Nothing in that request matched a setting on this page.
                        </AIMessage>
                    )}

                    {result.skipped.length > 0 && (
                        <AIMessage tone="warning">
                            Not changed: {result.skipped.map((entry) => `${entry.label} (${entry.reason})`).join('; ')}.
                        </AIMessage>
                    )}

                    {result.unmatched.length > 0 && (
                        <AIMessage tone="note">
                            {/* Naming the exact words that went nowhere is the honest
                                alternative to quietly doing nothing about them. */}
                            No setting matches {result.unmatched.map((clause) => `"${clause}"`).join(', ')} —
                            it may not be something this page controls.
                        </AIMessage>
                    )}

                    {result.changes.length > 0 && (
                        <div className={styles.actions}>
                            <Button
                                value={`Preview ${acceptedCount} change${acceptedCount === 1 ? '' : 's'}`}
                                icon={<LuSparkles />}
                                primary
                                disabled={acceptedCount === 0}
                                onClick={apply}
                            />
                            <Button value="Discard" icon={<LuX />} onClick={() => setResult(null)} />
                        </div>
                    )}
                </>
            )}

            {undoState && !result && (
                <AIMessage tone="note">
                    Changes applied to the preview on the right. Press <strong>Save Changes</strong> above to keep them.
                </AIMessage>
            )}
        </div>
    );
}
