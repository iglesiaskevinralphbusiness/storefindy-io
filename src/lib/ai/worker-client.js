'use client';
// Main-thread half of the AI worker. Owns the worker's lifecycle and turns its
// message protocol into promises.
//
// One worker is shared by every AI panel in the tab, so opening the CSV cleaner
// after the documentation assistant reuses the model already in memory. It is
// created on the first request — never at import time — and can be released
// when the last panel closes.
import { detectAiSupport } from './models';

let worker = null;
let nextId = 1;
/** jobId -> { resolve, reject, onProgress } */
const pending = new Map();

function ensureWorker() {
    if (worker) return worker;

    // `new URL(..., import.meta.url)` is what tells the bundler to emit the
    // worker as its own chunk; a string path here would 404 in production.
    worker = new Worker(new URL('../../workers/ai-worker.js', import.meta.url), {
        type: 'module',
        name: 'storefindy-ai',
    });

    worker.addEventListener('message', (event) => {
        const { id, type, payload } = event.data ?? {};
        const job = pending.get(id);
        if (!job) return;

        if (type === 'progress') {
            job.onProgress?.(payload);
            return;
        }
        pending.delete(id);
        if (type === 'error') job.reject(new Error(payload?.message || 'AI job failed.'));
        else job.resolve(payload);
    });

    worker.addEventListener('error', (event) => {
        // A worker-level error (a failed module load, an out-of-memory kill)
        // takes every in-flight job down with it, so they all have to be told.
        const message = event.message || 'The AI worker stopped unexpectedly.';
        for (const [, job] of pending) job.reject(new Error(message));
        pending.clear();
        worker = null;
    });

    return worker;
}

/**
 * Run one job in the AI worker.
 *
 * @param {string} type 'warm' | 'embed'
 * @param {object} payload Job input.
 * @param {{ onProgress?: (p: object) => void, signal?: AbortSignal }} options
 *   `signal` aborts cooperatively — the worker stops at its next chunk
 *   boundary and the promise rejects with an AbortError.
 */
export function runAiJob(type, payload = {}, { onProgress, signal } = {}) {
    const support = detectAiSupport();
    if (!support.supported) return Promise.reject(new Error(support.reason));

    const id = nextId++;
    const instance = ensureWorker();

    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, onProgress });

        if (signal) {
            if (signal.aborted) {
                pending.delete(id);
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }
            signal.addEventListener('abort', () => {
                if (!pending.has(id)) return;
                pending.delete(id);
                instance.postMessage({ id, type: 'cancel' });
                reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
        }

        instance.postMessage({ id, type, payload });
    });
}

/**
 * Embed a list of strings.
 *
 * @returns {Promise<Float32Array[]>} One unit-length vector per input, in order.
 */
export async function embedTexts(texts, options = {}) {
    const { vectors, dims, count } = await runAiJob('embed', { texts }, options);
    const out = [];
    for (let i = 0; i < count; i++) out.push(vectors.subarray(i * dims, (i + 1) * dims));
    return out;
}

/** Download and initialise the embedding model without asking anything of it. */
export function warmAi(options = {}) {
    return runAiJob('warm', { model: 'embedder' }, options);
}

/** Drop the worker and everything it holds. Called when the last AI panel closes. */
export function releaseAiWorker() {
    if (!worker) return;
    worker.terminate();
    worker = null;
    for (const [, job] of pending) job.reject(new Error('AI worker released.'));
    pending.clear();
}

/** True when a model is already loaded in this tab, so a panel can skip its notice. */
export const isAiWorkerRunning = () => worker !== null;
