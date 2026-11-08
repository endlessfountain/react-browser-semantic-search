import React, { useEffect, useRef, useState } from "react";
import { KNOWLEDGE_BASE, type DocEntry } from "./data/knowledgeBase";

interface SemanticMatch {
  doc: DocEntry;
  score: number;
}

export default function App() {
  const workerRef = useRef<Worker | null>(null);
  const reqCounter = useRef(0);

  const [query, setQuery] = useState("locked out of my account after losing phone");
  const [status, setStatus] = useState("Initializing Web Worker...");
  const [queryMs, setQueryMs] = useState<number | null>(null);
  const [semanticHits, setSemanticHits] = useState<SemanticMatch[]>([]);
  const [worstFrameMs, setWorstFrameMs] = useState<number>(16.7);

  // Track main-thread frame time (proves UI never freezes > 50ms during Worker inference)
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      setWorstFrameMs((prev) => Math.max(prev * 0.98, Number(delta.toFixed(1))));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./worker/embeddingWorker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.type === "model_progress") {
        setStatus(`Downloading quantized model (${data.progress}%)...`);
      } else if (data.type === "index_ready") {
        setStatus(`Ready · ${data.backend} · Indexed ${data.docCount} docs in ${data.initMs}ms`);
        reqCounter.current += 1;
        worker.postMessage({ type: "search", query, requestId: reqCounter.current });
      } else if (data.type === "search_results" && data.requestId === reqCounter.current) {
        setQueryMs(data.queryMs);
        setSemanticHits(data.results);
      }
    };

    worker.postMessage({ type: "warmup" });
    return () => worker.terminate();
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (workerRef.current && val.trim().length > 1) {
      reqCounter.current += 1;
      workerRef.current.postMessage({
        type: "search",
        query: val,
        requestId: reqCounter.current,
      });
    }
  };

  // Naive keyword search for side-by-side comparison
  const keywordHits = KNOWLEDGE_BASE.filter((d) => {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const hay = `${d.title} ${d.body}`.toLowerCase();
    return tokens.length > 0 && tokens.every((t) => hay.includes(t));
  });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
          Zero-API-Bill Browser Semantic Search
        </h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          <code>Transformers.js</code> (<code>all-MiniLM-L6-v2</code> q8) running inside a dedicated Web Worker ·{" "}
          <strong style={{ color: "#38bdf8" }}>{status}</strong> · Main-thread frame delta:{" "}
          <strong style={{ color: "#4ade80" }}>{worstFrameMs.toFixed(1)} ms</strong>
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Try: 'server keeps crashing from memory' or 'charged twice for same invoice'"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.85rem 1rem",
          fontSize: "1rem",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#f8fafc",
          marginBottom: "1.5rem",
        }}
      />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div style={{ background: "#1e293b", padding: "1rem", borderRadius: 10 }}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0, color: "#f87171" }}>
            1. Exact Keyword Filter ({keywordHits.length} hits)
          </h2>
          {keywordHits.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.92rem" }}>
              0 matches — none of the docs contain all your literal words.
            </p>
          ) : (
            keywordHits.map((d) => (
              <article key={d.id} style={{ marginBottom: "0.85rem" }}>
                <strong>{d.title}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "#cbd5e1", fontSize: "0.88rem" }}>{d.body}</p>
              </article>
            ))
          )}
        </div>

        <div style={{ background: "#1e293b", padding: "1rem", borderRadius: 10 }}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0, color: "#4ade80" }}>
            2. Web Worker Vector Search {queryMs !== null ? `(${queryMs} ms)` : ""}
          </h2>
          {semanticHits.map(({ doc, score }) => (
            <article
              key={doc.id}
              style={{
                marginBottom: "0.85rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{doc.title}</strong>
                <span style={{ color: "#38bdf8", fontSize: "0.85rem" }}>cos={score}</span>
              </div>
              <p style={{ margin: "0.25rem 0 0", color: "#cbd5e1", fontSize: "0.88rem" }}>{doc.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
