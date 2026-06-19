"use client";

import React, { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/context/UserContext";
import GatekeeperModal from "@/components/GatekeeperModal";
import SpiritToast from "@/components/SpiritToast";

export default function FloatingComposer({
  onPost,
}: {
  onPost: (post: any) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const { user, loading } = useUser();

  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [gatekeeperOptions, setGatekeeperOptions] = useState<any[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const lastScroll = useRef(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hide composer on scroll
  useEffect(() => {
    function handleScroll() {
      const current = window.scrollY;
      if (current > lastScroll.current + 10) setHidden(true);
      else if (current < lastScroll.current - 10) setHidden(false);
      lastScroll.current = current;
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ⭐ NEW SERVER-POWERED GATEKEEPER LOGIC
  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) {
        console.error("Gatekeeper API error:", await res.text());
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error("Gatekeeper fetch failed:", err);
      return null;
    }
  }

  // ⭐ Insert final text into Supabase
  async function publishToSupabase(finalText: string) {
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
      console.error("Supabase insert error:", error);
      return;
    }

    if (data) onPost(data);
  }

  // ⭐ Main submit handler (your updated version)
  async function handleSubmit() {
  if (!content.trim()) return;
  if (loading || !user) return;

  const result = await runGatekeeper(content);

  console.log("GATEKEEPER RESULT:", result);

  // ⭐ Auto-approve positive posts
  if (result?.autoApprove) {
    publishToSupabase(content);
    setToastMessage("The spirits approve your message ✨");
    setContent("");
    setExpanded(false);
    return;
  }

  // ⭐ Otherwise show rewrite modal
  if (result?.rewrites) {
    console.log("REWRITES PASSED TO MODAL:", result.rewrites);

   const toneLabels = ["Calm", "Direct", "Elevated"];
const toneExplanations = [
  "Softens the tone while keeping your message intact.",
  "Keeps your message firm and straightforward.",
  "Elevates the language for a more refined delivery."
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

  // ⭐ User selects a rewrite
  function handleGatekeeperSelect(finalText: string) {
    setShowGatekeeper(false);
    publishToSupabase(finalText);
    setContent("");
    setExpanded(false);
  }

  return (
    <>
      {showGatekeeper && gatekeeperOptions && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={handleGatekeeperSelect}
          onClose={() => setShowGatekeeper(false)}
        />
      )}

      {toastMessage && (
        <SpiritToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div
        className={`
          fixed bottom-0 left-0 w-full px-4 pb-4 z-50 transition-all duration-300
          ${hidden ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"}
        `}
      >
        <div
          className={`
            bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10
            shadow-lg transition-all duration-300 mx-auto max-w-md
            ${expanded ? "p-4" : "p-3"}
          `}
        >
          {!expanded && (
            <div
              className="flex items-center justify-between text-gray-300"
              onClick={() => setExpanded(true)}
            >
              <span>Write something…</span>
              <span className="text-xl">✍🏽</span>
            </div>
          )}

          {expanded && (
            <div className="flex flex-col space-y-3">
              <textarea
                className="
                  w-full rounded-xl p-3 resize-none
                  bg-black/30 text-gray-200 placeholder-gray-400
                  border border-white/10 focus:outline-none
                  focus:ring-2 focus:ring-purple-500/40
                "
                rows={4}
                placeholder="Share your thoughts…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <button
                onClick={handleSubmit}
                disabled={!content.trim() || loading || !user}
                className={`
                  w-full py-2 rounded-xl font-semibold text-white
                  transition-all
                  ${
                    content.trim() && user
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-purple-900/40 text-gray-400"
                  }
                `}
              >
                Post
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
