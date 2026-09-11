// The AI model catalogue and the device check that decides whether to offer AI
// at all. Deliberately free of any `@huggingface/transformers` import: this
// module is read by page components on the main thread, and pulling the library
// in here would ship the ONNX runtime to every visitor of every dashboard page.
// Only src/workers/ai-worker.js ever imports the library itself.
//
// V1 SHIPS ONE MODEL, AND IT IS AN EMBEDDING MODEL — NOT A GENERATIVE ONE.
// Everything the AI features do is either a deterministic rule (see ./rules/)
// or a similarity ranking over text that already exists. A model that only
// produces vectors cannot invent a phone number, a URL, or a documentation
// answer: the worst it can do is rank the wrong existing string first, which
// the merchant sees and rejects in a preview. That property is what lets these
// features meet the "never hallucinate" bar, and it is why a 23MB download is
// enough where a 400MB instruction model would not have been.

/** Every model the worker knows how to load, keyed by the name callers use. */
export const AI_MODELS = {
    // Sentence embeddings. Used to rank CSV headers against Storefindy fields,
    // free-text values against the locator's own filter list, a natural-language
    // request against the settings it names, and a question against the
    // documentation. One 23MB download serves all four features.
    embedder: {
        id: 'Xenova/all-MiniLM-L6-v2',
        task: 'feature-extraction',
        // 8-bit weights. The full-precision model is ~90MB for no measurable
        // gain on short-text similarity.
        dtype: 'q8',
        approxBytes: 23 * 1024 * 1024,
        label: 'Text understanding',
    },
};

/**
 * The one sentence a merchant sees when AI can't run. Every blocker reports the
 * same thing on purpose: which capability is missing is a developer's concern,
 * and spelling it out would reveal where the AI runs.
 */
const UNSUPPORTED_REASON = 'AI features are not available in this browser.';

/**
 * Can this browser run the AI features at all?
 *
 * Only hard blockers are checked. A slow device is still allowed to try — the
 * work is batched, cancellable, and off the main thread, so the cost of being
 * wrong is a slow panel the merchant can close, not a frozen page.
 *
 * `reason` is shown to the merchant, so it is deliberately vague about *why*:
 * naming Web Workers or WebAssembly would tell them the AI runs on their own
 * machine, which the product does not surface. The specifics stay in the
 * branches below for whoever is debugging.
 *
 * @returns {{ supported: boolean, reason: string }}
 */
export function detectAiSupport() {
    if (typeof window === 'undefined') {
        return { supported: false, reason: UNSUPPORTED_REASON };
    }
    if (typeof Worker === 'undefined') {
        // No Web Workers.
        return { supported: false, reason: UNSUPPORTED_REASON };
    }
    if (typeof WebAssembly === 'undefined') {
        // No WebAssembly.
        return { supported: false, reason: UNSUPPORTED_REASON };
    }
    // `deviceMemory` is Chromium-only and reported in whole GB, rounded down and
    // capped at 8. Absent everywhere else, which is treated as "fine" rather
    // than "blocked" — Safari and Firefox run the embedding model comfortably.
    const memory = navigator.deviceMemory;
    if (typeof memory === 'number' && memory > 0 && memory < 1) {
        // Under 1GB of reported memory.
        return { supported: false, reason: UNSUPPORTED_REASON };
    }
    return { supported: true, reason: '' };
}
