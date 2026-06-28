"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function SoundComments({ postId, onSubmitted }: { postId: string; onSubmitted: () => void }) {
  const [text, setText] = useState("");
  const [gateData, setGateData] = useState<any>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;

    setBusy(true);

    // Call Gatekeeper
    const res = await fetch("/api/gatekeeper", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    const gate = await res.json();

    // ⭐ Auto-approved positive content
    if (gate.autoApprove) {
      await submitFinal(text, 2, 0.8);
      return;
    }

    // ⭐ Rewrite required
    setGateData(gate);
    setShowGateModal(true);
    setBusy(false);
  }

  async function submitFinal(finalText: string, automask: number, positivityRatio: number) {
    await fetch("/api/sound-comments", {
      method: "POST",
      body: JSON.stringify({
        post_id: postId,
        raw_input: text,
        final_text: finalText,
        automask,
        positivity_ratio: positivityRatio,
      }),
    });

    setText("");
    setShowGateModal(false);
    setGateData(null);
    setBusy(false);
    onSubmitted();
  }

  return (
    <div className="mt-10">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment…"
        className="w-full p-3 rounded bg-neutral-900 text-white border border-white/10"
      />

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-3 px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-500 disabled:opacity-50"
      >
        Comment
      </button>

      {showGateModal && gateData && (
        <Modal onClose={() => setShowGateModal(false)}>
          <div className="p-4 text-white">
            <h2 className="text-lg font-semibold mb-3">Rewrite Required</h2>

            {gateData.rewrites.map((r: string, idx: number) => (
              <button
                key={idx}
                onClick={() => submitFinal(r, 2, 0.8)}
                className="block w-full text-left p-3 mb-2 bg-neutral-800 rounded hover:bg-neutral-700"
              >
                {r}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
