'use client';
// Retrieval over the Storefindy documentation.
//
// STRICTLY READ-ONLY, AND STRICTLY EXTRACTIVE.
// The assistant answers by *finding* the passage of documentation that matches
// the question and showing it. There is no generative model in this path, so
// there is no mechanism by which it could describe a feature that doesn't
// exist: every word a merchant reads in an answer was written into
// src/lib/documentation-content.js by us. When nothing clears the relevance
// bar, it says so rather than reaching for the next-best passage.
//
// It also cannot *do* anything. This module imports no action, no API route and
// no model, only the documentation and the embedding worker; the panel that
// uses it renders text and links to documentation anchors.
import { DOC_SECTIONS, stripMarkup, blockToText } from '@/lib/documentation-content';
import { embedTexts } from './worker-client';
import { rank } from './vector';

/**
 * Below this a question is treated as unanswerable from the documentation.
 *
 * Measured, not guessed. Across a set of real merchant questions the weakest
 * genuine hit is 0.257 ("is there a refund policy" against Plans & Billing —
 * the section that would answer it, in words that share almost no vocabulary
 * with the question), while the strongest off-topic question scores 0.292 and
 * everything else off-topic lands under 0.24. 0.25 sits in that gap.
 *
 * An earlier version tried to be cleverer, blending in a keyword bonus and
 * requiring the best hit to beat the runner-up by a margin. Both made it worse:
 * a shared keyword lifts every passage that contains it, and a flat score is
 * often several passages being *legitimately* relevant, not the model being
 * lost. The plain threshold measures better, so the plain threshold is what
 * ships.
 */
const ANSWER_THRESHOLD = 0.25;

/** How many passages a single answer may draw on. */
const MAX_PASSAGES = 3;

/**
 * Split the documentation into passages.
 *
 * A whole section is too coarse — "Importing Locations via CSV" is a page of
 * text and the answer to "what are the required columns" is four lines of it.
 * So each section contributes one passage per heading group: the section's
 * intro, then everything under each `h4`, and each FAQ entry on its own.
 */
function buildPassages() {
    const passages = [];

    for (const section of DOC_SECTIONS) {
        let heading = '';
        let blocks = [];

        const flush = () => {
            const text = blocks.map(blockToText).filter(Boolean).join(' ');
            if (!text) return;
            passages.push({
                id: `${section.id}:${passages.length}`,
                anchor: section.id,
                section: section.title,
                sectionSub: section.sub,
                heading,
                blocks,
                // What is embedded: the section title gives the passage its
                // context, so "modes" under Import CSV doesn't have to compete
                // with "modes" anywhere else on similarity alone.
                text: `${section.title}. ${heading ? `${heading}. ` : ''}${text}`,
            });
            blocks = [];
        };

        for (const block of section.blocks) {
            if (block.type === 'faq') {
                // FAQ entries are already question-shaped, which is the ideal
                // unit to match a question against.
                for (const item of block.items) {
                    passages.push({
                        id: `${section.id}:faq:${passages.length}`,
                        anchor: section.id,
                        section: section.title,
                        sectionSub: section.sub,
                        heading: stripMarkup(item.q),
                        blocks: [{ type: 'p', text: item.a }],
                        text: `${stripMarkup(item.q)} ${stripMarkup(item.a)}`,
                    });
                }
                continue;
            }
            if (block.type === 'h4') {
                flush();
                heading = stripMarkup(block.text);
                continue;
            }
            blocks.push(block);
        }
        flush();
    }

    return passages;
}

/** Built once per tab; the documentation is static within a page load. */
let passagesCache = null;
let vectorsCache = null;

function getPassages() {
    if (!passagesCache) passagesCache = buildPassages();
    return passagesCache;
}

/**
 * Embed the corpus. Roughly 60 short passages, so about a second on a desktop
 * and a few on a phone — paid once, when the panel is first opened.
 */
async function getCorpusVectors(options) {
    if (vectorsCache) return vectorsCache;
    const passages = getPassages();
    vectorsCache = await embedTexts(passages.map((passage) => passage.text), options);
    return vectorsCache;
}

/** Warm the corpus so the first question doesn't pay for it. */
export async function prepareDocumentation(options = {}) {
    await getCorpusVectors(options);
    return getPassages().length;
}

/**
 * Answer a question from the documentation.
 *
 * @returns {Promise<{ found: boolean, passages: Array, message: string }>}
 *   `passages` carry the original blocks, so the panel renders them with the
 *   same formatting the documentation page uses — the merchant reads the real
 *   documentation, not a paraphrase of it.
 */
export async function askDocumentation(question, options = {}) {
    const query = String(question ?? '').trim();
    if (query.length < 3) {
        return { found: false, passages: [], message: 'Please ask a slightly longer question.' };
    }

    const passages = getPassages();
    const corpus = await getCorpusVectors(options);
    const [queryVector] = await embedTexts([query], options);

    const ranked = rank(
        queryVector,
        passages.map((passage, index) => ({ passage, vector: corpus[index] })),
        { threshold: ANSWER_THRESHOLD, limit: MAX_PASSAGES }
    );

    if (ranked.length === 0) {
        return {
            found: false,
            passages: [],
            message: "I couldn't find that information in the Store Locator documentation.",
        };
    }

    // Only keep the runners-up when they are genuinely close to the best hit.
    // A weak second passage adds noise, and the point of an extractive answer
    // is that every line of it is relevant.
    // Keep the runners-up only when they are genuinely close to the best hit.
    // A weak second passage adds noise, and the point of an extractive answer
    // is that every line of it is worth reading.
    const best = ranked[0].score;
    const kept = ranked.filter((hit) => hit.score >= best - 0.08);

    return {
        found: true,
        passages: kept.map((hit) => ({ ...hit.passage, score: hit.score })),
        message: '',
    };
}

/** Question suggestions shown before anything is typed. */
export const SUGGESTED_QUESTIONS = [
    'How do I add opening hours?',
    'How do I publish a location?',
    'What columns does the CSV import need?',
    'How do I embed the locator on my site?',
];

/** Exposed for tests and for a "browse instead" fallback in the panel. */
export { buildPassages };
