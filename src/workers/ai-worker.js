// The only place in the application that loads an AI model.
//
// Everything here runs off the main thread, so a model download, a tokenizer
// warm-up or a long embedding batch never blocks the dashboard's UI. The worker
// is spawned lazily by src/lib/ai/worker-client.js the first time a merchant
// actually opens an AI panel, and terminated when they are done with it — a
// merchant who never touches an AI feature never downloads a byte of this.
//
// PROTOCOL
//   in : { id, type: 'warm' | 'embed' | 'cancel', payload }
//   out: { id, type: 'progress' | 'result' | 'error', payload }
//
// `cancel` is cooperative: long jobs check the cancelled set between chunks.
// There is no way to interrupt a single ONNX run, so the granularity of a
// cancel is one chunk of texts, which is well under a second.
import { pipeline, env } from '@huggingface/transformers';
import { AI_MODELS } from '@/lib/ai/models';

// Models come from the HuggingFace CDN and are cached by the browser's Cache
// API afterwards, so the download happens once per model per browser.
env.allowLocalModels = false;
env.useBrowserCache = true;

// `env.backends.onnx.wasm.wasmPaths` is deliberately left alone.
//
// Transformers.js picks the ONNX Runtime build the current browser needs — the
// asyncify one everywhere, the plain one on Safari, which cannot run it — and
// points at the matching files on jsDelivr. Overriding the path with a
// self-hosted copy means committing to that choice ourselves, and an earlier
// attempt to do exactly that shipped only the plain build and failed in Chrome
// with "no available backend found". Self-hosting would also have bought less
// than it looked: the model weights come from the HuggingFace CDN regardless,
// so the feature is no more offline-capable either way.

// Single-threaded on purpose. Multi-threaded ONNX needs SharedArrayBuffer,
// which needs COOP/COEP headers on the whole origin — and those headers would
// break the embeddable widget's cross-origin loading. One thread is enough for
// a 23MB embedding model on short strings.
env.backends.onnx.wasm.numThreads = 1;

/** Loaded pipelines, keyed by model name. A model is loaded at most once. */
const loaded = new Map();
/** In-flight loads, so two panels opening at once share one download. */
const loading = new Map();
/** Job ids the main thread has asked to abandon. */
const cancelled = new Set();

/** How many texts go through the model in one call. */
const EMBED_CHUNK = 16;

const post = (id, type, payload) => self.postMessage({ id, type, payload });

/**
 * Get a pipeline, downloading the model on first use.
 *
 * Download progress is reported against `id` so the panel that triggered the
 * load can show it. A second panel waiting on the same load gets no progress
 * events, only the finished pipeline — it still sees the generic "preparing"
 * state its own caller set.
 */
async function getPipeline(name, id) {
    if (loaded.has(name)) return loaded.get(name);
    if (loading.has(name)) return loading.get(name);

    const model = AI_MODELS[name];
    if (!model) throw new Error(`Unknown AI model "${name}".`);

    const task = pipeline(model.task, model.id, {
        dtype: model.dtype,
        device: 'wasm',
        progress_callback: (event) => {
            if (event.status !== 'progress') return;
            post(id, 'progress', {
                stage: 'download',
                file: event.file,
                loaded: event.loaded ?? 0,
                total: event.total ?? 0,
                // `total` is missing for files served without a length header;
                // the client falls back to an indeterminate bar when it is 0.
                percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
            });
        },
    }).then((instance) => {
        loaded.set(name, instance);
        loading.delete(name);
        return instance;
    }).catch((error) => {
        loading.delete(name);
        throw error;
    });

    loading.set(name, task);
    return task;
}

/**
 * Mean-pooled, L2-normalised sentence embeddings.
 *
 * Normalising in the model means similarity is a plain dot product on the other
 * side, which keeps src/lib/ai/vector.js free of any tensor library.
 *
 * @returns {{ vectors: Float32Array, dims: number, count: number }} One flat
 *   buffer rather than an array of arrays: it transfers to the main thread with
 *   no copy, and the caller slices it by `dims`.
 */
async function embed(id, { texts = [] }) {
    const extractor = await getPipeline('embedder', id);

    const total = texts.length;
    if (total === 0) return { vectors: new Float32Array(0), dims: 0, count: 0 };

    let out = null;
    let dims = 0;

    for (let start = 0; start < total; start += EMBED_CHUNK) {
        if (cancelled.has(id)) throw new CancelledError();

        const chunk = texts.slice(start, start + EMBED_CHUNK);
        const tensor = await extractor(chunk, { pooling: 'mean', normalize: true });
        const data = tensor.data;

        if (out === null) {
            dims = data.length / chunk.length;
            out = new Float32Array(dims * total);
        }
        out.set(data, start * dims);

        post(id, 'progress', {
            stage: 'embed',
            loaded: Math.min(start + chunk.length, total),
            total,
            percent: Math.round((Math.min(start + chunk.length, total) / total) * 100),
        });
    }

    return { vectors: out, dims, count: total };
}

/** Thrown when a job is abandoned; reported as its own type so the client stays quiet. */
class CancelledError extends Error {
    constructor() {
        super('cancelled');
        this.name = 'CancelledError';
    }
}

const HANDLERS = {
    // Download and initialise a model without asking anything of it, so a panel
    // can pay the cost up front while the merchant is still typing.
    warm: async (id, payload) => {
        await getPipeline(payload?.model ?? 'embedder', id);
        return { ready: true };
    },
    embed,
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data ?? {};

    if (type === 'cancel') {
        cancelled.add(id);
        return;
    }

    const handler = HANDLERS[type];
    if (!handler) {
        post(id, 'error', { message: `Unknown AI job type "${type}".` });
        return;
    }

    try {
        const result = await handler(id, payload ?? {});
        if (cancelled.has(id)) {
            cancelled.delete(id);
            return;
        }
        // Transfer the embedding buffer instead of structured-cloning it: a
        // 2,000-row CSV is a 3MB Float32Array, and copying it would double the
        // peak memory at exactly the moment the browser is tightest.
        const transfer = result?.vectors instanceof Float32Array ? [result.vectors.buffer] : [];
        self.postMessage({ id, type: 'result', payload: result }, transfer);
    } catch (error) {
        cancelled.delete(id);
        if (error?.name === 'CancelledError') return;
        post(id, 'error', { message: error?.message || 'The AI model failed to run.' });
    }
});
