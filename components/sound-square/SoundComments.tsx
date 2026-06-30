"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import SpiritToast from "@/components/SpiritToast";
import Link from "next/link";
import { useRouter } from "next/navigation";   // ⭐ ADDED

export default function SoundComments({
  postId,
  onSubmitted,
}: {
  postId: string;
  onSubmitted: () => void;
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();                  // ⭐ ADDED

  const [text, setText] = useState("");
  const [gateData, setGateData] = useState<any>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // ⭐ Load creator_id for badge
  useEffect(() => {
    async function loadCreator() {
      const { data } = await supabase
        .from("sound_posts")
        .select("creator_id")
        .eq("id", postId)
        .single();

      if (data?.creator_id) setCreatorId(data.creator_id);
    }

    loadCreator();
  }, [postId, supabase]);

  async function handleSubmit() {
    if (!text.trim()) return;

    setBusy(true);

    const res = await fetch("/api/gatekeeper", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    const gate = await res.json();

    // ⭐ Auto-approved positive content
    if (gate.autoApprove && !gate.rewriteNeeded) {
      await submitFinal(gate.finalText, gate.automask, gate.positivityRatio);
      setToastMessage("The spirits approve your message ✨");
      return;
    }

    // ⭐ Rewrite required
    if (gate.rewriteNeeded) {
      setGateData(gate);
      setShowGateModal(true);
      setBusy(false);
      return;
    }

    // ⭐ Neutral comment → auto-approve silently
    await submitFinal(gate.finalText, gate.automask, gate.positivityRatio);
  }

  async function submitFinal(
    finalText: string,
    automask: number,
    positivityRatio: number
  ) {
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

    // ⭐ CRITICAL FIX: Refresh Sound Square feed
    router.refresh();

    onSubmitted();
  }

  return (
    <div className="mt-10 bg-neutral-900/40 p-4 rounded-lg border border-white/10 animate-[fadeIn_0.4s_ease-out_forwards] opacity-0">

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

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
        {busy ? "Posting…" : "Comment"}
      </button>

      {/* ⭐ Gatekeeper Rewrite Modal */}
      {showGateModal && gateData && (
        <Modal onClose={() => setShowGateModal(false)}>
          <div className="p-4 text-white">
            <h2 className="text-lg font-semibold mb-3">Rewrite Required</h2>

            <p className="text-yellow-300 text-sm mb-2">
              The spirits suggest a more uplifting version:
            </p>

            {gateData.rewrites.map((r: string, idx: number) => (
              <button
                key={idx}
                onClick={() => submitFinal(r, gateData.automask, gateData.positivityRatio)}
                className="block w-full text-left p-3 mb-2 bg-neutral-800 rounded hover:bg-neutral-700"
              >
                {r}
              </button>
            ))}

            <button
              onClick={() => setShowGateModal(false)}
              className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Keep original
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
