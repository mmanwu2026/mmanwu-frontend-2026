"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VisionShareCard from "./VisionShareCard";

export default function VisionShareButton({
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
  const [open, setOpen] = useState(false);

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
    <div className="mt-6">
      <button
        onClick={() => setOpen(true)}
        className="
          px-4 py-2 bg-blue-600 hover:bg-blue-500 
          text-white rounded shadow transition-all
        "
      >
        Share
      </button>

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
            <VisionShareCard
              postId={postId}
              title={title}
              imageUrl={imageUrl || ""}
              creatorUsername={creatorUsername}
            />

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={handleCopyLink}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded"
              >
                Copy Link
              </button>

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
