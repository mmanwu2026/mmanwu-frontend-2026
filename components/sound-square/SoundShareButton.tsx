"use client";

import { useState } from "react";

export default function SoundShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sound-square/post/${postId}`
      : "";

  async function handleCopy() {
  try {
    await navigator.clipboard.writeText(shareUrl);

    // ⭐ NEW — call backend analytics
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
      <button
        onClick={handleCopy}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
      >
        {copied ? "Copied!" : "Share Link"}
      </button>
    </div>
  );
}
