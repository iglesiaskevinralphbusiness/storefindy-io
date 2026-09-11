// Similarity helpers over the worker's embeddings.
//
// The worker returns L2-normalised vectors, so cosine similarity is just a dot
// product — no tensor library, no allocation, and cheap enough to run over a
// few hundred candidates on every keystroke.

/** Cosine similarity of two unit-length vectors, in [-1, 1]. */
export function similarity(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

/**
 * Rank `candidates` against `query` and keep the ones that clear `threshold`.
 *
 * @param {Float32Array} query
 * @param {Array<{ vector: Float32Array }>} candidates Each carries its own payload.
 * @param {{ threshold?: number, limit?: number }} options
 * @returns {Array<object & { score: number }>} Best first.
 */
export function rank(query, candidates, { threshold = 0, limit = Infinity } = {}) {
    return candidates
        .map((candidate) => ({ ...candidate, score: similarity(query, candidate.vector) }))
        .filter((candidate) => candidate.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
