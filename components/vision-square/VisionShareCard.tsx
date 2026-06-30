"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/vision-square/post/${postId}`
      : "";

  async function logShare(maskTier = 4) {
    await fetch("/api/vision-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: postId,
        maskTier,
        post_type: "vision",
      }),
    });

    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/vision-square/feed")) {
        router.refresh();
      }
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      await logShare(4);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  async function handleCopyImage() {
    try {
      const img = await fetch(imageUrl);
      const blob = await img.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);

      await logShare(4);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy image failed:", err);
    }
  }

  function downloadShareCard() {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, "_")}.jpg`;
    link.click();
    logShare(4);
  }

  function shareToWhatsApp() {
    const text = encodeURIComponent(`${title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    logShare(4);
  }

  function shareToTwitter() {
    const text = encodeURIComponent(`${title} — by @${creatorUsername}\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    logShare(4);
  }

  function shareToThreads() {
    const text = encodeURIComponent(`${title}\n${shareUrl}`);
    window.open(`https://www.threads.net/intent/post?text=${text}`, "_blank");
    logShare(4);
  }

  function shareToInstagramStories() {
    window.open(`instagram://story-camera`, "_blank");
    logShare(4);
  }

  function shareToTikTok() {
    window.open(`https://www.tiktok.com/upload?lang=en`, "_blank");
    logShare(4);
  }

  return (
    <div
      className="
        bg-neutral-900 border border-white/10 rounded-xl p-4 
        shadow-xl max-w-sm mx-auto
        animate-[fadeIn_0.3s_ease-out_forwards] opacity-0
      "
    >
      {/* Image */}
      <div className="w-full h-64 rounded-lg overflow-hidden border border-white/10 mb-4">
        <img
          src={imageUrl || ""}
          alt="Vision"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title */}
      <h2 className="text-white text-xl font-semibold mb-2">{title}</h2>

      {/* Creator */}
      <p className="text-purple-300 text-sm mb-4">@{creatorUsername}</p>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`
          w-full px-4 py-2 rounded mb-3 text-white transition-all
          ${
            copied
              ? "bg-green-600 shadow-lg shadow-green-900/40"
              : "bg-blue-600 hover:bg-blue-500"
          }
        `}
      >
        {copied ? "Copied!" : "Copy Share Link"}
      </button>

      {/* Share Options */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={handleCopyImage}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded"
        >
          Copy Image
        </button>

        <button
          onClick={downloadShareCard}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded"
        >
          Download Card
        </button>

        <button
          onClick={shareToWhatsApp}
          className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded"
        >
          WhatsApp
        </button>

        <button
          onClick={shareToTwitter}
          className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-2 rounded"
        >
          Twitter/X
        </button>

        <button
          onClick={shareToThreads}
          className="bg-black hover:bg-gray-800 text-white px-3 py-2 rounded"
        >
          Threads
        </button>

        <button
          onClick={shareToInstagramStories}
          className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-2 rounded"
        >
          Instagram Stories
        </button>

        <button
          onClick={shareToTikTok}
          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded"
        >
          TikTok
        </button>
      </div>
    </div>
  );
}
