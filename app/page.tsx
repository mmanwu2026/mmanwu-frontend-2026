"use client";

import { useState } from "react";

type BackendResponse = {
  message?: string;
  postId?: string | number;
  [key: string]: any;
};

const GATEKEEPER_MASKS = [
  { value: "1", label: "Mask 1 — Dark Whisper" },
  { value: "2", label: "Mask 2 — Fierce Awakener" },
  { value: "3", label: "Mask 3 — Steady Witness" },
  { value: "4", label: "Mask 4 — Joy Herald" },
  { value: "5", label: "Mask 5 — Ancestral Uplift" },
];

export default function CreatePostPage() {
  const [text, setText] = useState("");
  const [selectedMask, setSelectedMask] = useState("3");
  const [loading, setLoading] = useState(false);
  const [backendResponse, setBackendResponse] = useState<BackendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBackendResponse(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Frontend never exposes the real secret; this is just a mask selector.
          "x-gatekeeper-mask": selectedMask,
        },
        body: JSON.stringify({
          text,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error (${res.status}): ${text}`);
      }

      const data = (await res.json()) as BackendResponse;
      setBackendResponse(data);
    } catch (err: any) {
      setError(err?.message || "Unknown error talking to backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Mmanwu Plaza — Create Post</h1>
        <p className="text-sm text-slate-300 mb-6">
          Type your post, choose the Gatekeeper mask, and send it through the Plaza.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Post text
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hello Mmanwu..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Gatekeeper mask
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedMask}
              onChange={(e) => setSelectedMask(e.target.value)}
            >
              {GATEKEEPER_MASKS.map((mask) => (
                <option key={mask.value} value={mask.value}>
                  {mask.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Sending to Gatekeeper..." : "Submit to Plaza"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <div className="font-semibold mb-1">Error</div>
            <div>{error}</div>
          </div>
        )}

        {backendResponse && (
          <div className="mt-6 rounded-lg border border-emerald-500 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            <div className="font-semibold mb-1">Backend Response</div>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(backendResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
