"use client";

import React, { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function FloatingComposer({ onPost }: { onPost: () => void }) {
  const [content, setContent] = useState("");
  const [mask, setMask] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const lastScroll = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const current = window.scrollY;
      if (current > lastScroll.current + 10) {
        setHidden(true);
      } else if (current < lastScroll.current - 10) {
        setHidden(false);
      }
      lastScroll.current = current;
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function submitPost() {
    if (!content.trim() || !mask) return;

    const creatorId = "demo-user-001";

    await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, mask, creatorId }),
    });

    setContent("");
    setMask(null);
    setExpanded(false);
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

            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMask(m)}
                  className={`
                    text-2xl transition-all
                    ${mask === m ? "scale-125" : "opacity-60"}
                  `}
                >
                  {m === 1 && "😶‍🌫️"}
                  {m === 2 && "😤"}
                  {m === 3 && "😊"}
                  {m === 4 && "🤩"}
                  {m === 5 && "😇"}
                </button>
              ))}
            </div>

            <button
              onClick={submitPost}
              disabled={!content.trim() || !mask}
              className={`
                w-full py-2 rounded-xl text-white font-semibold
                transition-all
                ${
                  content.trim() && mask
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
    </div>
  );
}
