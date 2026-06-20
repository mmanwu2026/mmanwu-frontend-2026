"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/context/UserContext";
import GatekeeperModal from "@/components/GatekeeperModal";
import SpiritToast from "@/components/SpiritToast";

export default function FloatingComposer({ onPost }: { onPost: (post: any) => void }) {
  const supabase = createSupabaseBrowserClient();
  const { user, loading } = useUser();

  const [content, setContent] = useState("");

  const [gatekeeperOptions, setGatekeeperOptions] = useState<any[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function publishToSupabase(finalText: string) {
    if (!user) return;

    const { data } = await supabase
      .from("posts")
      .insert({
        content: finalText,
        creator_id: user.id,
        mask: 0,
      })
      .select()
      .single();

    if (data) onPost(data);
  }

  async function handleSubmit() {
    if (!content.trim() || loading || !user) return;

    const result = await runGatekeeper(content);

    if (result?.autoApprove) {
      publishToSupabase(content);
      setToastMessage("The spirits approve your message ✨");
      setContent("");
      return;
    }

    if (result?.rewrites) {
      const toneLabels = ["Calm", "Direct", "Elevated"];
      const toneExplanations = [
        "Softens the tone while keeping your message intact.",
        "Keeps your message firm and straightforward.",
        "Elevates the language for a more refined delivery.",
      ];

      const formatted = result.rewrites.map((text: string, i: number) => ({
        label: toneLabels[i],
        text,
        explanation: toneExplanations[i],
      }));

      setGatekeeperOptions(formatted);
      setShowGatekeeper(true);
    }
  }

  function handleGatekeeperSelect(finalText: string) {
    setShowGatekeeper(false);
    publishToSupabase(finalText);
    setContent("");
  }

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

      {/* ALWAYS-OPEN COMPOSER */}
      <div className="w-full p-3 rounded-2xl bg-purple-900/40 backdrop-blur-xl shadow-xl">

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
          onChange={(e) => setContent(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || loading || !user}
          className="
            w-full mt-3 py-2 rounded-xl font-semibold transition-all
          "
        >
          {loading ? "Posting..." : "Post"}
        </button>

      </div>
    </>
  );
}
