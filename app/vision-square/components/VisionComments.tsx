"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import SpiritToast from "@/components/SpiritToast";
import Link from "next/link";
import { useRouter } from "next/navigation";   // ⭐ ADDED

interface VisionCommentsProps {
  postId: string;
}

export default function VisionComments({ postId }: VisionCommentsProps) {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();                  // ⭐ ADDED

  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [gateData, setGateData] = useState<any | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [creatorId, setCreatorId] = useState<string | null>(null);

  // ⭐ Load creator_id for badge
  useEffect(() => {
    async function loadCreator() {
      const { data } = await supabase
        .from("vision_posts")
        .select("creator_id")
        .eq("id", postId)
        .single();

      if (data?.creator_id) setCreatorId(data.creator_id);
    }

    loadCreator();
  }, [postId, supabase]);

  // ⭐ Corrected Gatekeeper Logic
  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) throw new Error("Gatekeeper request failed");

      return await res.json();
    } catch (err) {
      console.error("Gatekeeper fallback:", err);

      // ⭐ Neutral fallback — does NOT break Vision Square logic
      return {
        rewriteNeeded: false,
        autoApprove: true,
        finalText: rawText,
        automask: 2,
        positivityRatio: 0.5,
      };
    }
  }

async function insertComment(finalText: string, automask: number) {
  const { error: dbError } = await supabase
    .from("vision_post_comments")
    .insert({
      post_id: postId,
      user_id: user?.id,
      content: finalText,     // ⭐ FIXED
      automask,
    });

  if (dbError) {
    console.error(dbError);
    setError("Failed to post comment.");
    return false;
  }

  router.refresh();
  return true;
}

  async function handleSubmit() {
    setError("");

    if (!user) {
      setError("You must be logged in to comment.");
      return;
    }

    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }

    setLoading(true);

    const gate = await runGatekeeper(content.trim());

    // ⭐ Auto-approved positive comment
    if (gate.autoApprove && !gate.rewriteNeeded) {
      const ok = await insertComment(gate.finalText, gate.automask);

      if (ok) {
        if (gate.positivityRatio >= 0.6 || gate.automask >= 3) {
          setToastMessage("Your words uplift the spirits ✨");
        }

        setContent("");
      }

      setLoading(false);
      return;
    }

    // ⭐ Rewrite required
    if (gate.rewriteNeeded) {
      setGateData(gate);
      setShowGateModal(true);
      setLoading(false);
      return;
    }

    // ⭐ Non-positive but allowed comment
    const ok = await insertComment(gate.finalText, gate.automask);

    if (ok) setContent("");

    setLoading(false);
  }

  async function acceptRewrite(rewrite: string) {
    setLoading(true);

    const ok = await insertComment(rewrite, gateData.automask);

    if (ok) {
      if (gateData.positivityRatio >= 0.6 || gateData.automask >= 3) {
        setToastMessage("Your words uplift the spirits ✨");
      }

      setContent("");
      setGateData(null);
      setShowGateModal(false);
    }

    setLoading(false);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">

      {/* ⭐ SpiritToast */}
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <textarea
        className="w-full bg-gray-800 text-white rounded p-2 mb-3 text-sm"
        placeholder="Add a comment…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {/* ⭐ Gatekeeper Rewrite Modal */}
      {showGateModal && gateData && (
        <div className="bg-gray-800 border border-yellow-500/40 rounded p-3 mb-3 animate-[fadeIn_0.3s_ease-out_forwards] opacity-0">
          <p className="text-yellow-300 text-sm mb-2">
            The spirits suggest a more uplifting version:
          </p>

          {gateData.rewrites.map((r: string, idx: number) => (
            <button
              key={idx}
              onClick={() => acceptRewrite(r)}
              className="block w-full text-left p-3 mb-2 bg-neutral-700 rounded hover:bg-neutral-600"
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
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-purple-600 px-4 py-2 rounded text-sm hover:bg-purple-500 disabled:opacity-50"
      >
        {loading ? "Posting…" : "Post comment"}
      </button>
    </div>
  );
}
