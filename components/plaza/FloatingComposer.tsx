"use client";

import React, { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import GatekeeperModal from "@/components/GatekeeperModal";
import SpiritToast from "@/components/SpiritToast";

interface GatekeeperResponse {
  autoApprove?: boolean;
  rewrites?: string[];
}

interface RewriteOption {
  label: string;
  text: string;
  explanation: string;
}

interface FloatingComposerProps {
  onPost: (post: any) => void;
}

export default function FloatingComposer({ onPost }: FloatingComposerProps) {
  // ⭐ GLOBAL SUPABASE CLIENT — SAFE
  const supabase = useSupabase();

  const { user, loading } = useUser();

  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [gatekeeperOptions, setGatekeeperOptions] = useState<RewriteOption[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // -----------------------------
  // Gatekeeper API
  // -----------------------------
  async function runGatekeeper(rawText: string): Promise<GatekeeperResponse | null> {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) return null;
      return (await res.json()) as GatekeeperResponse;
    } catch {
      return null;
    }
  }

  // -----------------------------
  // Publish to Supabase
  // -----------------------------
  async function publishToSupabase(finalText: string): Promise<void> {
    if (!user) return;

    const { data, error } = await supabase
      .from("posts")
      .insert({
        content: finalText,
        creator_id: user.id,
        mask: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Post insert error:", error);
      return;
    }

    if (data) onPost(data);
  }

  // -----------------------------
  // Submit Handler
  // -----------------------------
  async function handleSubmit(): Promise<void> {
    if (!content.trim() || loading || !user) return;

    const result = await runGatekeeper(content);

    // Auto-approve path
    if (result?.autoApprove) {
      await publishToSupabase(content);
      setToastMessage("The spirits approve your message ✨");
      setContent("");
      setExpanded(false);
      return;
    }

    // Rewrite path
    if (result?.rewrites) {
      const toneLabels = ["Calm", "Direct", "Elevated"];
      const toneExplanations = [
        "Softens the tone while keeping your message intact.",
        "Keeps your message firm and straightforward.",
        "Elevates the language for a more refined delivery.",
      ];

      const formatted: RewriteOption[] = result.rewrites.map((text, i) => ({
        label: toneLabels[i],
        text,
        explanation: toneExplanations[i],
      }));

      setGatekeeperOptions(formatted);
      setShowGatekeeper(true);
    }
  }

  // -----------------------------
  // Gatekeeper Selection
  // -----------------------------
  function handleGatekeeperSelect(finalText: string): void {
    setShowGatekeeper(false);
    publishToSupabase(finalText);
    setContent("");
    setExpanded(false);
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      {/* Gatekeeper Modal */}
      {showGatekeeper && gatekeeperOptions && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={handleGatekeeperSelect}
          onClose={() => setShowGatekeeper(false)}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* COLLAPSED BUTTON */}
      {!expanded && (
        <div
          className="w-full p-3 rounded-xl bg-purple-900/40 text-gray-300 cursor-pointer hover:bg-purple-800/40 transition-all"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center justify-between">
            <span>Write something…</span>
            <span className="text-xl">✍🏽</span>
          </div>
        </div>
      )}

      {/* EXPANDED PANEL */}
      {expanded && (
        <div className="absolute left-[180px] top-20 w-[360px] p-4 rounded-2xl bg-purple-900/40 backdrop-blur-xl shadow-xl z-[6000]">
          <textarea
            className="
              w-full rounded-xl p-3 resize-none
              placeholder-gray-400
              focus:outline-none
              focus:ring-2 focus:ring-purple-500/40
              bg-purple-950/40
            "
            rows={5}
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value)
            }
          />

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading || !user}
            className="w-full mt-3 py-2 rounded-xl font-semibold transition-all"
          >
            {loading ? "Posting..." : "Post"}
          </button>

          <button
            className="text-sm text-gray-400 hover:text-gray-300 mt-2"
            onClick={() => setExpanded(false)}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
