import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { KNOWLEDGE_BASE } from "../data/knowledgeBase";
import { l2Normalize, rankNormalizedIndex } from "../math/cosineSearch";

// Allow browser Cache API storage so the ~23MB quantized ONNX model downloads once
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const EMBED_DIM = 384;

let extractor: FeatureExtractionPipeline | null = null;
let flatDocIndex: Float32Array | null = null;

async function ensureIndexReady(): Promise<void> {
  if (extractor && flatDocIndex) return;

  const t0 = performance.now();
  const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

  extractor = await pipeline("feature-extraction", MODEL_ID, {
    dtype: "q8",
    device: hasWebGPU ? "webgpu" : "wasm",
    progress_callback: (info: Record<string, unknown>) => {
      if (info.status === "progress") {
        self.postMessage({
          type: "model_progress",
          file: info.file,
          progress: Math.round(Number(info.progress ?? 0)),
        });
      }
    },
  });

  // Pre-embed knowledge base once off the main UI thread
  flatDocIndex = new Float32Array(KNOWLEDGE_BASE.length * EMBED_DIM);
  for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
    const doc = KNOWLEDGE_BASE[i];
    const out = await extractor(`${doc.title}. ${doc.body}`, {
      pooling: "mean",
      normalize: true,
    });
    const normVec = l2Normalize(out.data as Float32Array);
    flatDocIndex.set(normVec, i * EMBED_DIM);
  }

  self.postMessage({
    type: "index_ready",
    backend: hasWebGPU ? "WebGPU" : "WASM (Quantized q8)",
    docCount: KNOWLEDGE_BASE.length,
    initMs: Math.round(performance.now() - t0),
  });
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === "warmup") {
    await ensureIndexReady();
    return;
  }

  if (msg.type === "search") {
    await ensureIndexReady();
    if (!extractor || !flatDocIndex) return;

    const tStart = performance.now();
    const qOut = await extractor(String(msg.query), {
      pooling: "mean",
      normalize: true,
    });
    const qVec = l2Normalize(qOut.data as Float32Array);
    const ranked = rankNormalizedIndex(qVec, flatDocIndex, EMBED_DIM, 4);
    const queryMs = Number((performance.now() - tStart).toFixed(1));

    self.postMessage({
      type: "search_results",
      requestId: msg.requestId,
      queryMs,
      results: ranked.map((hit) => ({
        doc: KNOWLEDGE_BASE[hit.index],
        score: Number(hit.score.toFixed(3)),
      })),
    });
  }
};
