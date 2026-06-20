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

  async function handleSubmit() {
    if (!content.trim()) return;
    if (loading || !user) return;

    const result = await runGatekeeper(content);

    console.log("GATEKEEPER RESULT:", result);

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
            floating-composer-container
            rounded-2xl transition-all duration-300 mx-auto max-w-md
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
                  floating-composer-textarea
                  w-full rounded-xl p-3 resize-none
                  placeholder-gray-400
                  focus:outline-none
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
