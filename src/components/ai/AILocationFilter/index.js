'use client';
// Natural-language filtering above the Locations table.
//
// This is an admin-side convenience only — it is not on the customer-facing
// store locator, and the widget bundle never imports it.
//
// It writes its result into the page's URL, exactly like the manual filter
// below it, so the server component re-runs its normal query and the merchant
// can bookmark, share or reload a filtered view. The AI's only output is the
// structured list; the query itself is built server-side from a whitelist in
// src/lib/locations-query.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LuSparkles, LuX, LuFilter } from 'react-icons/lu';
import Button from '@/components/Forms/Button';
import styles from '../AI.module.scss';
import filterStyles from './AILocationFilter.module.scss';
import { AIProgress, AIMessage, AIPanelHead, AIFirstRunNote } from '../AIStatus';
import { useAiSupport } from '@/lib/ai/use-ai-support';
import { FILTER_PARAM, encodeLocationFilters, describeFilter } from '@/lib/ai/location-filter';
import { interpretLocationRequest } from '@/lib/ai/location-filter-intent';

const EXAMPLES = [
    'Show me all the locations that have Free Wifi',
    'Show all locations that are not published',
    'Show me all inactive locations',
    'Unpublished stores in Manila',
];

export default function AILocationFilter({ locators = [], active = [] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const support = useAiSupport();
    const [open, setOpen] = useState(active.length > 0);
    const [request, setRequest] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const abortRef = useRef(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    // Every filter defined across the account's locators. This is the closed
    // list an amenity phrase can resolve to — the model cannot produce a tag
    // that no locator actually defines.
    const allowedFilters = useMemo(() => {
        const seen = new Map();
        for (const locator of locators) {
            for (const filter of Array.isArray(locator.filters) ? locator.filters : []) {
                const value = String(filter ?? '').trim();
                if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
            }
        }
        return [...seen.values()];
    }, [locators]);

    const run = useCallback(async (text) => {
        const prompt = text.trim();
        if (!prompt || busy) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError('');
        setMessage('');
        setProgress({ stage: 'model', loaded: 0, total: 0, percent: 0 });

        try {
            const result = await interpretLocationRequest(
                prompt,
                { allowedFilters, locators },
                { signal: controller.signal, onProgress: setProgress }
            );

            if (!result.filters.length && !result.search && !result.locatorIds.length) {
                setMessage("That didn't match anything the Locations page can filter by. Try naming a city, a filter, or whether the locations are published.");
                return;
            }

            // Merge into the URL rather than replacing it: the manual search and
            // locator pickers below stay in charge of their own parameters, and
            // a page number from a previous view would be meaningless now.
            const params = new URLSearchParams(searchParams);
            params.delete('page');

            const encoded = encodeLocationFilters(result.filters);
            if (encoded) params.set(FILTER_PARAM, encoded);
            else params.delete(FILTER_PARAM);

            if (result.search) params.set('search', result.search);
            if (result.locatorIds.length) params.set('locators', result.locatorIds.join(','));

            if (result.unmatched.length) {
                setMessage(`Ignored: ${result.unmatched.map((clause) => `"${clause}"`).join(', ')}.`);
            }

            router.push(`${pathname}?${params.toString()}`);
        } catch (caught) {
            if (caught?.name !== 'AbortError') {
                setError(caught?.message || 'AI is unavailable right now. The filters below still work as usual.');
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }, [busy, allowedFilters, locators, searchParams, router, pathname]);

    const clear = () => {
        const params = new URLSearchParams(searchParams);
        params.delete(FILTER_PARAM);
        params.delete('page');
        setRequest('');
        setMessage('');
        router.push(`${pathname}?${params.toString()}`);
    };

    if (support === null) return null;

    // No panel at all on a device that can't run the model: the manual filter
    // directly below does the same job, and an empty disabled box above it
    // would only be noise.
    if (!support.supported && active.length === 0) return null;

    return (
        <div className={filterStyles.wrap}>
            {active.length > 0 && (
                <div className={filterStyles.chips}>
                    <LuFilter />
                    <span className={filterStyles.chipsLabel}>AI filter</span>
                    {active.map((filter, index) => (
                        <span key={`${filter.field}-${index}`} className={filterStyles.chip}>
                            {describeFilter(filter)}
                        </span>
                    ))}
                    <button type="button" className={filterStyles.chipClear} onClick={clear}>
                        <LuX /> Clear
                    </button>
                </div>
            )}

            {support.supported && (
                open ? (
                    <div className={styles.panel}>
                        <AIPanelHead title="Find locations by describing them" />
                        <p className={styles.desc}>
                            Ask in plain language. Your words are turned into the same filters
                            the form below uses — nothing is changed or deleted.
                        </p>

                        <div className={styles.prompt}>
                            <div className={styles.promptField}>
                                <input
                                    type="text"
                                    value={request}
                                    disabled={busy}
                                    placeholder="e.g. Unpublished stores in Manila with Free Wifi"
                                    onChange={(event) => setRequest(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            run(request);
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                value={busy ? 'Finding…' : 'Find'}
                                icon={<LuSparkles />}
                                primary
                                disabled={busy || !request.trim()}
                                onClick={() => run(request)}
                            />
                            <Button value="" icon={<LuX />} onClick={() => setOpen(false)} />
                        </div>

                        {!busy && (
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
                        <AIMessage tone="note">{message}</AIMessage>
                        <AIMessage tone="error">{error}</AIMessage>
                    </div>
                ) : (
                    <button type="button" className={filterStyles.opener} onClick={() => setOpen(true)}>
                        <LuSparkles /> Find locations by describing them
                    </button>
                )
            )}
        </div>
    );
}
