"use client";

import { useState } from "react";

export default function VisionShareCard({
  postId,
  title,
  imageUrl,
  creatorUsername,
}: {
  postId: string;
  title: string;
  imageUrl: string;
  creatorUsername: string;
}) {
  const [copied, setCopied] = useState(false);

  // ⭐ Hydration-safe share URL
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/vision-square/post/${postId}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);

      // ⭐ FIX: Add headers for analytics POST
      await fetch("/api/vision-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <div
      className="
        bg-neutral-900 border border-white/10 rounded-xl p-4 
        shadow-xl max-w-sm mx-auto
        animate-[fadeIn_0.3s_ease-out_forwards] opacity-0
      "
    >
      {/* ⭐ Vision Image */}
      <div className="w-full h-64 rounded-lg overflow-hidden border border-white/10 mb-4">
        <img
          src={imageUrl || ""} // ⭐ Safe fallback
          alt="Vision"
          className="w-full h-full object-cover"
        />
      </div>

      {/* ⭐ Title */}
      <h2 className="text-white text-xl font-semibold mb-2">{title}</h2>

      {/* ⭐ Creator */}
      <p className="text-purple-300 text-sm mb-4">@{creatorUsername}</p>

      {/* ⭐ Copy Share Link */}
      <button
        onClick={handleCopy}
        className={`
          w-full px-4 py-2 rounded mb-3 text-white transition-all
          ${
            copied
              ? "bg-green-600 shadow-lg shadow-green-900/40"
              : "bg-blue-600 hover:bg-blue-500"
          }
        `}
        aria-live="polite"
      >
        {copied ? "Copied!" : "Copy Share Link"}
      </button>

      {/* ⭐ Social Buttons */}
      <div className="space-y-3">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
            shareUrl
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-white"
        >
          Share on X (Twitter)
        </a>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
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
    </div>
  );
}
