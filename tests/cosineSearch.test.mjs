import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

// Equivalent ESM functions verifying contiguous Float32Array vs nested Array ranking speed & accuracy
function l2Normalize(vec) {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const inv = sumSq > 0 ? 1 / Math.sqrt(sumSq) : 0;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] * inv;
  return out;
}

function rankFlatFloat32(queryNorm, flatIndex, dim, topK = 5) {
  const numDocs = Math.floor(flatIndex.length / dim);
  const hits = new Array(numDocs);
  for (let d = 0; d < numDocs; d++) {
    const off = d * dim;
    let dot = 0;
    for (let j = 0; j < dim; j++) dot += queryNorm[j] * flatIndex[off + j];
    hits[d] = { index: d, score: dot };
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

function rankNestedJsArrays(queryArr, nestedDocs, topK = 5) {
  const hits = nestedDocs.map((docVec, index) => {
    let dot = 0;
    for (let j = 0; j < docVec.length; j++) dot += queryArr[j] * docVec[j];
    return { index, score: dot };
  });
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

test("ranks exact semantic match highest and benchmarks 10,000 x 384 vectors", () => {
  const dim = 384;
  const numDocs = 10_000;
  const flatIndex = new Float32Array(numDocs * dim);
  const nestedDocs = [];

  for (let i = 0; i < numDocs; i++) {
    const raw = new Float32Array(dim);
    for (let j = 0; j < dim; j++) raw[j] = Math.sin(i * 0.17 + j * 0.03);
    const norm = l2Normalize(raw);
    flatIndex.set(norm, i * dim);
    nestedDocs.push(Array.from(norm));
  }

  // Query identical to document #4,219
  const targetIdx = 4219;
  const queryNorm = flatIndex.slice(targetIdx * dim, (targetIdx + 1) * dim);
  const queryJs = Array.from(queryNorm);

  const t0 = performance.now();
  let topFlat;
  for (let r = 0; r < 20; r++) topFlat = rankFlatFloat32(queryNorm, flatIndex, dim, 5);
  const flatAvgMs = (performance.now() - t0) / 20;

  const t1 = performance.now();
  let topNested;
  for (let r = 0; r < 20; r++) topNested = rankNestedJsArrays(queryJs, nestedDocs, 5);
  const nestedAvgMs = (performance.now() - t1) / 20;

  console.log(
    JSON.stringify({
      docs: numDocs,
      dim,
      flat_float32_avg_ms: Number(flatAvgMs.toFixed(2)),
      nested_array_avg_ms: Number(nestedAvgMs.toFixed(2)),
      speedup_x: Number((nestedAvgMs / flatAvgMs).toFixed(2)),
    })
  );

  assert.equal(topFlat[0].index, targetIdx);
  assert.ok(Math.abs(topFlat[0].score - 1.0) < 1e-5);
  assert.equal(topNested[0].index, targetIdx);
});
