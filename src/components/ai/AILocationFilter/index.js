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
//
// The two filters are alternatives, not layers. Running a described search
// replaces whatever the form below held, and submitting that form clears this
// one (see components/Dashboard/Locations/Filter). Merging them meant a stale
// search box could silently empty a described result, and neither control
// showed the merchant why.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LuSparkles, LuX, LuFilter } from 'react-icons/lu';
import Button from '@/components/Forms/Button';
import styles from '../AI.module.scss';
import filterStyles from './AILocationFilter.module.scss';
import { AIMessage, AIPanelHead } from '../AIStatus';
import { FILTER_PARAM, encodeLocationFilters, describeFilter } from '@/lib/ai/location-filter';
import { TZ_PARAM } from '@/lib/ai/schedule-filter';
import { interpretLocationRequest } from '@/lib/ai/location-filter-intent';
import { getLocationPlaceVocabulary } from '@/actions/locations';

const EXAMPLES = [
    'Show me all locations that are open now',
    'Show me all locations that are closed on monday',
    'Show all locations that are not published',
    'unpublished stores in manila with Free Wifi',
    'stores in california, united states',
];

/**
 * URL parameters the described search keeps: how the table is displayed, not
 * what it shows. Everything else — `search`, `locators`, `page` — belongs to the
 * manual form or to a previous result, and a new described search replaces them.
 */
const VIEW_PARAMS = ['rows', 'sort', 'order'];

function viewOnlyParams(searchParams) {
    const params = new URLSearchParams();
    for (const key of VIEW_PARAMS) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
    }
    return params;
}

export default function AILocationFilter({ locators = [], active = [] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The account's distinct city/state/country/postal values, fetched once the
    // merchant actually describes something rather than rendered into every
    // page load. See lib/ai/place-resolver.js for what they are read against.
    const placesRef = useRef(null);
    const [open, setOpen] = useState(active.length > 0);
    const [request, setRequest] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

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

    // Failing to load the vocabulary is not a failed search: the resolver falls
    // back to matching the words across all four address columns, which is what
    // the page did before it could read an address at all.
    const loadPlaces = useCallback(async () => {
        if (placesRef.current) return placesRef.current;
        try {
            placesRef.current = await getLocationPlaceVocabulary();
        } catch {
            placesRef.current = {};
        }
        return placesRef.current;
    }, []);

    const run = useCallback(async (text) => {
        const prompt = text.trim();
        if (!prompt || busy) return;

        setBusy(true);
        setError('');
        setMessage('');

        try {
            const places = await loadPlaces();

            // Reading the sentence is rules, not a model — the same rules the
            // storefront locator runs. Nothing to download, nothing to wait for,
            // and it works the same on every device.
            const result = interpretLocationRequest(prompt, { allowedFilters, locators, places });

            const encoded = encodeLocationFilters(result.filters);
            if (!encoded) {
                setMessage("That didn't match anything the Locations page can filter by. Try naming a place, a filter, or whether the locations are published.");
                return;
            }

            // Replace the URL rather than merging into it. The described search
            // is the whole query: a leftover `search` or `locators` from the
            // form below would narrow this result without appearing anywhere in
            // the chips, and a page number from a previous view is meaningless.
            const params = viewOnlyParams(searchParams);
            params.set(FILTER_PARAM, encoded);
            // "open now" has to mean now where the merchant is, not where the
            // server runs. The OFFSET travels rather than the clock, so a
            // bookmarked search is still about now when it is reopened.
            params.set(TZ_PARAM, String(new Date().getTimezoneOffset()));

            if (result.unmatched.length) {
                setMessage(`Ignored: ${result.unmatched.map((clause) => `"${clause}"`).join(', ')} — nothing in your locations matches that.`);
            }

            router.push(`${pathname}?${params.toString()}`);
        } catch (caught) {
            setError(caught?.message || 'Something went wrong reading that. The filters below still work as usual.');
        } finally {
            setBusy(false);
        }
    }, [busy, allowedFilters, locators, loadPlaces, searchParams, router, pathname]);

    const clear = () => {
        setRequest('');
        setMessage('');
        router.push(`${pathname}?${viewOnlyParams(searchParams).toString()}`);
    };

    return (
        <div className={filterStyles.wrap}>
            {active.length > 0 && (
                <div className={filterStyles.chips}>
                    <LuFilter />
                    <span className={filterStyles.chipsLabel}>AI filter</span>
                    {active.map((filter, index) => (
                        <span key={`${filter.field}-${index}`} className={filterStyles.chip}>
                            {describeFilter(filter, { locators })}
                        </span>
                    ))}
                    <button type="button" className={filterStyles.chipClear} onClick={clear}>
                        <LuX /> Clear
                    </button>
                </div>
            )}

            {
                open ? (
                    <div className={styles.panel}>
                        <AIPanelHead title="Find locations by describing them" />
                        <p className={styles.desc}>
                            Ask in plain language. Spelling, capitals and address format don&apos;t
                            matter — places are matched against your own locations. This searches on
                            its own and clears the filter form below; nothing is changed or deleted.
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

                        <AIMessage tone="note">{message}</AIMessage>
                        <AIMessage tone="error">{error}</AIMessage>
                    </div>
                ) : (
                    <button type="button" className={filterStyles.opener} onClick={() => setOpen(true)}>
                        <LuSparkles /> Find locations by describing them
                    </button>
                )
            }
        </div>
    );
}
