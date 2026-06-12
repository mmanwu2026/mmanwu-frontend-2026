"use client";

import React, { useState, useRef, useEffect } from "react";
import GatekeeperModal from "./GatekeeperModal";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function FloatingComposer({ onPost }: { onPost: () => void }) {
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [gatekeeperOptions, setGatekeeperOptions] = useState<any[]>([]);
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);

  const lastScroll = useRef(0);

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

  /* ---------------------------------------------------------
     STEP 1 — Send raw text to Gatekeeper (NO MASK REQUIRED)
     --------------------------------------------------------- */
  async function submitPost() {
    if (!content.trim()) return;

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        creator_id: "viewer-demo-001",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error creating post");
      return;
    }

    // If Gatekeeper returns refined options
    if (data.options) {
      setGatekeeperOptions(data.options);
      setShowGatekeeperModal(true);
      return;
    }

    // Otherwise publish raw content
    await publishFinalVersion(content);
  }

  /* ---------------------------------------------------------
     STEP 2 — Publish chosen refined version
     ALWAYS mask_tier = 0 (maskless posting)
     --------------------------------------------------------- */
  async function publishFinalVersion(finalText: string) {
    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: finalText,
        mask_tier: 0,                 // ⭐ ALWAYS 0 — maskless posting
        creator_id: "viewer-demo-001",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error publishing post");
      return;
    }

    // Reset composer
    setContent("");
    setExpanded(false);
    setShowGatekeeperModal(false);

    onPost();
  }

  return (
    <div
      className={`
        fixed bottom-0 left-0 w-full px-4 pb-4 z-50 transition-all duration-300
        ${hidden ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"}
      `}
    >
      <div
        className={`
          bg-white shadow-xl rounded-2xl border border-gray-200
          transition-all duration-300 mx-auto max-w-md
          ${expanded ? "p-4" : "p-3"}
        `}
      >
        {!expanded && (
          <div
            className="flex items-center justify-between"
            onClick={() => setExpanded(true)}
          >
            <span className="text-gray-500">Write something…</span>
            <span className="text-xl">✍🏽</span>
          </div>
        )}

        {expanded && (
          <div className="flex flex-col space-y-3">
            <textarea
              className="w-full border rounded-xl p-3 text-gray-800 resize-none"
              rows={4}
              placeholder="Share your thoughts…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button
              onClick={submitPost}
              disabled={!content.trim()}
              className={`
                w-full py-2 rounded-xl text-white font-semibold
                transition-all
                ${
                  content.trim()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400"
                }
              `}
            >
              Post
            </button>

            <button
              className="text-sm text-gray-500 underline"
              onClick={() => setExpanded(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {showGatekeeperModal && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={(text) => publishFinalVersion(text)}
          onClose={() => setShowGatekeeperModal(false)}
        />
      )}
    </div>
  );
}
