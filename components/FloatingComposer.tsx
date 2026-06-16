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

  // ⭐ UPGRADED GATEKEEPER LOGIC
  async function runGatekeeper(rawText: string) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_OPENAI_API_KEY");
      return null;
    }

    // 1️⃣ Emotion + toxicity + bullying analysis
    const analysisRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `
You are the Mmanwu Emotional Classifier.

Analyze the user's message and return a JSON object with:
- emotion: one of ["joy","excitement","gratitude","pride","relief","celebration","anger","sadness","fear","anxiety","neutral"]
- intensity: number 0–1
- toxicity: number 0–1
- bullying: number 0–1
- clarity: number 0–1
Return ONLY valid JSON.
            `,
          },
          { role: "user", content: rawText },
        ],
        temperature: 0,
      }),
    });

    const analysisText = await analysisRes.json();
    let analysis;

    try {
      analysis = JSON.parse(
        analysisText?.choices?.[0]?.message?.content || "{}"
      );
    } catch {
      analysis = { emotion: "neutral", intensity: 0, toxicity: 0, bullying: 0, clarity: 1 };
    }

    const { emotion, intensity, toxicity, bullying, clarity } = analysis;

    // 2️⃣ Auto-approve rule for positive posts
    const positiveEmotions = ["joy", "excitement", "gratitude", "pride", "relief", "celebration"];

    if (
      positiveEmotions.includes(emotion) &&
      toxicity < 0.1 &&
      bullying < 0.1 &&
      clarity >= 0.4
    ) {
      return { autoApprove: true };
    }

    // 3️⃣ Generate rewrites + explanations
    const rewriteRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `
You are the Mmanwu Gatekeeper.

Rewrite the user's message into 3 versions:
1. Calm
2. Direct
3. Elevated (if the message is positive, allow refined celebration with correct exclamation marks)

For each rewrite, also provide:
- explanation: why this rewrite is safer, clearer, or more expressive.

Return the result as JSON:
[
  { "label": "Calm", "text": "...", "explanation": "..." },
  { "label": "Direct", "text": "...", "explanation": "..." },
  { "label": "Elevated", "text": "...", "explanation": "..." }
]
            `,
          },
          { role: "user", content: rawText },
        ],
        temperature: 0.7,
      }),
    });

    const rewriteText = await rewriteRes.json();
    let rewrites;

    try {
      rewrites = JSON.parse(
        rewriteText?.choices?.[0]?.message?.content || "[]"
      );
    } catch {
      rewrites = [];
    }

    return { autoApprove: false, rewrites };
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

    const result = await runGatekeeper(content);

    // ⭐ Auto-approve positive posts
    if (result?.autoApprove) {
      publishToSupabase(content);

      // TODO: Toast will be added in Part 4
      console.log("The spirits approve your message ✨");

      setContent("");
      setExpanded(false);
      return;
    }

    // ⭐ Otherwise show rewrite modal
    if (result?.rewrites) {
      setGatekeeperOptions(result.rewrites);
      setShowGatekeeper(true);
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
