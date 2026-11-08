/**
 * Contiguous Float32Array vector math for fast browser & Web Worker cosine ranking.
 * Packing N vectors of dimension D into one flat Float32Array avoids GC churn
 * and nested JS Array pointer chasing during interactive typing.
 */

export interface RankedHit {
  index: number;
  score: number;
}

export function l2Normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const invNorm = sumSq > 0 ? 1 / Math.sqrt(sumSq) : 0;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] * invNorm;
  }
  return out;
}

/**
 * Compute dot-product cosine similarity between a normalized query [dim]
 * and a flat row-major matrix [numDocs * dim] of normalized document vectors.
 */
export function rankNormalizedIndex(
  queryNorm: Float32Array,
  flatIndex: Float32Array,
  dim: number,
  topK: number = 5
): RankedHit[] {
  const numDocs = Math.floor(flatIndex.length / dim);
  const hits: RankedHit[] = new Array(numDocs);

  for (let docIdx = 0; docIdx < numDocs; docIdx++) {
    const offset = docIdx * dim;
    let dot = 0;
    for (let j = 0; j < dim; j++) {
      dot += queryNorm[j] * flatIndex[offset + j];
    }
    hits[docIdx] = { index: docIdx, score: dot };
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}
