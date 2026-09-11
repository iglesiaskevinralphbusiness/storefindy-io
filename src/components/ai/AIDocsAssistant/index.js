'use client';
// The "Ask AI" helper: a small floating button that opens a compact help panel.
//
// Read-only by construction. The panel imports one thing — the documentation
// retriever — and renders passages of documentation with a link to where they
// live on the page. It cannot change a location, a setting or a subscription,
// because nothing that could do any of those is reachable from here.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LuSparkles, LuX, LuSend, LuArrowUpRight, LuMessageCircle } from 'react-icons/lu';
import styles from './AIDocsAssistant.module.scss';
import { AIProgress, AIMessage, AIFirstRunNote } from '../AIStatus';
import { useAiSupport } from '@/lib/ai/use-ai-support';
import { askDocumentation, prepareDocumentation, SUGGESTED_QUESTIONS } from '@/lib/ai/documentation';
import { renderRichText, DocBlock } from '@/components/Dashboard/Documentation';

/** Where the full documentation lives. */
const DOCS_PATH = '/dashboard/documentation';

/**
 * Routes the helper stays off, despite sitting in the dashboard layout.
 *
 * The customize screen is a full-bleed editor: a sidebar on the left and the
 * live widget preview filling everything else, right down to the corner the
 * launcher would float in. Worse, the same route serves the standalone preview
 * (`?preview=1`, opened in its own tab from the locator list), whose entire
 * purpose is to show the widget exactly as a visitor sees it — a help pill
 * floating over it would be plainly wrong. That screen has its own AI panel in
 * the sidebar anyway.
 */
const HIDDEN_PREFIXES = ['/dashboard/locators/customize'];

export default function AIDocsAssistant() {
    const support = useAiSupport();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [answer, setAnswer] = useState(null);   // { found, passages, message, question }
    const [error, setError] = useState('');
    const abortRef = useRef(null);
    const warmRef = useRef(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    /**
     * Open the panel and start downloading the model straight away, so the
     * first question only waits for its own embedding rather than for the whole
     * documentation corpus.
     *
     * Deliberately not an effect: this is work started by a click, and running
     * it from an effect would mean setting state during render-commit for no
     * benefit.
     */
    const openPanel = () => {
        setOpen(true);

        warmRef.current?.abort();
        const controller = new AbortController();
        warmRef.current = controller;

        setProgress({ stage: 'model', loaded: 0, total: 0, percent: 0 });
        prepareDocumentation({ signal: controller.signal, onProgress: setProgress })
            .catch((caught) => {
                if (caught?.name !== 'AbortError') {
                    setError('AI is unavailable right now. You can still read the full documentation on this page.');
                }
            })
            .finally(() => setProgress(null));
    };

    const closePanel = () => {
        warmRef.current?.abort();
        abortRef.current?.abort();
        setOpen(false);
        setProgress(null);
    };

    // Escape closes the panel, as it would any other dismissible overlay.
    useEffect(() => {
        if (!open) return;
        const onKey = (event) => { if (event.key === 'Escape') closePanel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const ask = useCallback(async (text) => {
        const prompt = text.trim();
        if (!prompt || busy) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError('');
        setAnswer(null);
        setProgress({ stage: 'search', loaded: 0, total: 0, percent: 0 });

        try {
            const result = await askDocumentation(prompt, {
                signal: controller.signal,
                onProgress: setProgress,
            });
            setAnswer({ ...result, question: prompt });
        } catch (caught) {
            if (caught?.name !== 'AbortError') {
                setError('AI is unavailable right now. You can still read the full documentation on this page.');
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }, [busy]);

    // Nothing at all when AI can't run — a dead button helps no one, and every
    // page the assistant sits on works exactly as it did before it existed.
    if (support === null || !support.supported) return null;
    if (HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) return null;

    // Where "Read the full section" should point, which depends on where the
    // panel is being shown:
    //   • on the documentation page itself — a plain fragment, so the browser
    //     scrolls instead of navigating;
    //   • elsewhere in the dashboard — the documentation page plus the anchor;
    //   • on a public page — nowhere. /dashboard/documentation is behind the
    //     login, so a signed-out visitor would be bounced to the sign-in form
    //     for a link that looked like it opened a help article. The panel
    //     already shows the passage in full, so the link is what goes.
    const sectionHref = (anchor) => {
        if (pathname === DOCS_PATH) return `#${anchor}`;
        if (pathname?.startsWith('/dashboard')) return `${DOCS_PATH}#${anchor}`;
        return null;
    };

    if (!open) {
        return (
            <button type="button" className={styles.launcher} onClick={openPanel}>
                <LuMessageCircle /> Ask AI
            </button>
        );
    }

    return (
        <div className={styles.panel} role="dialog" aria-label="Ask about Store Locator">
            <div className={styles.header}>
                <LuSparkles />
                <span>Ask about Store Locator</span>
                <button type="button" className={styles.close} onClick={closePanel} aria-label="Close">
                    <LuX />
                </button>
            </div>

            <div className={styles.body}>
                {!answer && !busy && (
                    <>
                        <div className={styles.prompt}>How can we help?</div>
                        <ul className={styles.suggestions}>
                            {SUGGESTED_QUESTIONS.map((suggestion) => (
                                <li key={suggestion}>
                                    <button
                                        type="button"
                                        onClick={() => { setQuestion(suggestion); ask(suggestion); }}
                                    >
                                        {suggestion}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className={styles.scope}>
                            Answers come from this documentation only, word for word.
                            I can’t change anything in your account.
                        </p>
                    </>
                )}

                <AIProgress progress={progress} />
                {progress?.stage === 'model' && <AIFirstRunNote />}
                <AIMessage tone="error">{error}</AIMessage>

                {answer && (
                    <div className={styles.answer}>
                        <div className={styles.asked}>{answer.question}</div>

                        {answer.found ? (
                            answer.passages.map((passage) => (
                                <div key={passage.id} className={styles.passage}>
                                    <div className={styles.passageHead}>
                                        {passage.section}
                                        {passage.heading ? <span> · {passage.heading}</span> : null}
                                    </div>
                                    <div className={styles.passageBody}>
                                        {passage.blocks.map((block, index) => (
                                            // The documentation page's own block components, rendered
                                            // with this panel's stylesheet so an answer looks like the
                                            // documentation it came from at panel size.
                                            <DocBlock key={index} block={block} styles={styles} />
                                        ))}
                                    </div>
                                    {sectionHref(passage.anchor) && (
                                        <a
                                            className={styles.passageLink}
                                            href={sectionHref(passage.anchor)}
                                            onClick={closePanel}
                                        >
                                            Read the full section <LuArrowUpRight />
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className={styles.notFound}>
                                {renderRichText(answer.message)}
                                <p>Try rephrasing it, or browse the sections on this page.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <form
                className={styles.footer}
                onSubmit={(event) => { event.preventDefault(); ask(question); }}
            >
                <input
                    // The panel is opened by an explicit click and its only
                    // purpose is to take a question, so focus belongs here.
                    autoFocus
                    type="text"
                    value={question}
                    disabled={busy}
                    placeholder="Ask a question..."
                    onChange={(event) => setQuestion(event.target.value)}
                />
                <button type="submit" disabled={busy || !question.trim()} aria-label="Ask">
                    <LuSend />
                </button>
            </form>
        </div>
    );
}
