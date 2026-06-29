"use client";

import { useState } from "react";

export default function SoundShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sound-square/post/${postId}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);

      // Analytics
      await fetch("/api/sound-share", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
      });

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <div className="mt-6">
      {/* Main Share Button */}
      <button
        onClick={() => setOpen(true)}
        className="
          px-4 py-2 bg-blue-600 hover:bg-blue-500 
          text-white rounded shadow 
          transition-all
        "
      >
        Share
      </button>

      {/* Share Modal */}
      {open && (
        <div
          className="
            fixed inset-0 bg-black/70 backdrop-blur-sm 
            flex items-center justify-center z-[5000]
          "
          onClick={() => setOpen(false)}
        >
          <div
            className="
              bg-neutral-900 p-6 rounded-xl w-full max-w-sm 
              border border-white/10 shadow-xl
              animate-[fadeIn_0.3s_ease-out_forwards] opacity-0
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white text-lg font-semibold mb-4">
              Share this Sound
            </h2>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className={`
                w-full px-4 py-2 rounded mb-3 
                text-white transition-all
                ${copied 
                  ? "bg-green-600 shadow-lg shadow-green-900/40" 
                  : "bg-blue-600 hover:bg-blue-500"}
              `}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>

            {/* Social Buttons */}
            <div className="space-y-3">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  shareUrl
                )}`}
                target="_blank"
                className="block w-full text-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-white"
              >
                Share on X (Twitter)
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                className="block w-full text-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-white"
              >
                Share on WhatsApp
              </a>

              <a
                href={`sms:?body=${encodeURIComponent(shareUrl)}`}
                className="block w-full text-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-white"
              >
                Share via SMS
              </a>
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 text-white/60 hover:text-white text-sm"
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
