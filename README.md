# `react-browser-semantic-search` — Zero-API-Bill Semantic Search in React & Web Workers

A client-side semantic document search engine built with **React 18**, **TypeScript**, **Vite**, and **`@huggingface/transformers`** (`Xenova/all-MiniLM-L6-v2` 8-bit quantized ONNX) running inside a dedicated **Web Worker**.

## Why Offload `Transformers.js` to a Web Worker?

Importing an ONNX embedding pipeline directly inside a React component runs tokenization and matrix multiplication on the browser's main UI thread—dropping scrolling and typing to `0 FPS` (`>350 ms` Long Tasks).

Moving the pipeline into `src/worker/embeddingWorker.ts`:
1. **Zero OpenAI / Vector DB API spend:** Embeddings compute locally on the user's device (`WebGPU` when available, automatic fallback to quantized `WASM`).
2. **Cached after first visit:** Uses the browser `Cache API` (`env.useBrowserCache = true`) so the ~23 MB quantized model downloads once.
3. **60 FPS UI responsiveness:** Live `requestAnimationFrame` delta tracking in `App.tsx` confirms main-thread frame times stay smooth (~`16.7 ms`) during query inference.
4. **Compact memory layout:** Document vectors (`N × 384`) are packed into a single contiguous `Float32Array` (`~15.3 MB` for `10,000` documents vs. `~61 MB+` for boxed JavaScript number arrays) and ranked in `~21.9 ms`.

## Quick Start

```bash
npm install

# Run unit & 10,000-vector ranking benchmark (Node 20+)
npm test

# Start Vite dev server
npm run dev
```

## Architecture

- `src/worker/embeddingWorker.ts` — Loads `Xenova/all-MiniLM-L6-v2` (`dtype: "q8"`), pre-indexes docs into a flat `Float32Array`, and serves `search` messages.
- `src/math/cosineSearch.ts` — L2 normalization and flat dot-product cosine ranking.
- `src/App.tsx` — Side-by-side comparison showing exact keyword search (`0` hits when words don't match literally) vs. Web Worker semantic search, alongside a live main-thread frame-time monitor.
- `tests/cosineSearch.test.mjs` — Native Node test runner verifying ranking accuracy and benchmarking `10,000 × 384` vector scans.
