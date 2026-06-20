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
  const [expanded, setExpanded] = useState(false);

  const [gatekeeperOptions, setGatekeeperOptions] = useState<any[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Slight dimming layer when expanded
  const dimOpacity = expanded ? "bg-black/20 backdrop-blur-[1px]" : "bg-transparent";

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
      setExpanded(false);
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
    setExpanded(false);
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

      {/* DIM BACKDROP WHEN EXPANDED */}
      {expanded && (
        <div
          className={`
            fixed inset-0 z-[9000]
            transition-all duration-300
            ${dimOpacity}
          `}
          onClick={() => setExpanded(false)}
        />
      )}

      {/* COMPOSER CONTAINER */}
      <div
        className={`
          transition-all duration-300
          ${expanded ? "fixed right-0 top-32 z-[9999]" : "relative"}
          ${expanded ? "w-[360px]" : "w-full"}
        `}
        style={{
          width: expanded ? "360px" : "100%",
        }}
      >
        <div
          className={`
            floating-composer-container
            rounded-2xl transition-all duration-300
            ${expanded ? "p-4 shadow-xl bg-purple-900/40 backdrop-blur-xl" : "p-3"}
            ${expanded ? "w-[360px]" : "max-w-[180px]"}
          `}
        >
          {/* COLLAPSED MODE */}
          {!expanded && (
            <div
              className="flex items-center justify-between text-gray-300 cursor-pointer"
              onClick={() => setExpanded(true)}
            >
              <span>Write something…</span>
              <span className="text-xl">✍🏽</span>
            </div>
          )}

          {/* EXPANDED MODE */}
          {expanded && (
            <div className="flex flex-col space-y-3">
              <textarea
                className="
                  floating-composer-textarea
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
                  floating-composer-button
                  w-full py-2 rounded-xl font-semibold transition-all
                "
              >
                {loading ? "Posting..." : "Post"}
              </button>

              <button
                className="text-sm text-gray-400 hover:text-gray-300"
                onClick={() => setExpanded(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
