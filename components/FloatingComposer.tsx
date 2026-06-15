"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/context/UserContext";
import GatekeeperModal from "@/components/GatekeeperModal";

export default function FloatingComposer({
  onPost,
}: {
  onPost: (post: any) => void;
}) {
  const { user, loading } = useUser();

  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [gatekeeperOptions, setGatekeeperOptions] = useState<any[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const lastScroll = useRef(0);

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

  // ⭐ Step 1 — Call OpenAI Gatekeeper
  async function runGatekeeper(rawText: string) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY; // ⭐ FIXED HERE
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_OPENAI_API_KEY");
      return null;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are the Mmanwu Gatekeeper. Rewrite the user's text into 3 stylistic options: 'Calm', 'Direct', and 'Elevated'. Keep meaning but improve clarity and emotional tone.",
          },
          { role: "user", content: rawText },
        ],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const lines = text.split("\n").filter((l: string) => l.trim() !== "");

    return [
      { id: 1, label: "Calm", text: lines[0] || rawText },
      { id: 2, label: "Direct", text: lines[1] || rawText },
      { id: 3, label: "Elevated", text: lines[2] || rawText },
    ];
  }

  // ⭐ Step 2 — Insert final text into Supabase
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

  // ⭐ Step 3 — Main submit handler
  async function handleSubmit() {
    if (!content.trim()) return;
    if (loading || !user) return;

    const options = await runGatekeeper(content);

    if (options) {
      setGatekeeperOptions(options);
      setShowGatekeeper(true);
    } else {
      publishToSupabase(content);
    }
  }

  // ⭐ Step 4 — User selects a rewrite
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
