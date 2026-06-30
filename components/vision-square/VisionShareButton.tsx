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

  // ⭐ Hydration-safe share URL
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/vision-square/post/${postId}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);

      // ⭐ Log share event to Supabase via API route
      await fetch("/api/vision-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });

      // ⭐ CRITICAL FIX: Refresh the FEED, not the Post page
      router.refresh();

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <div className="mt-6">
      {/* ⭐ Main Share Button */}
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

      {/* ⭐ Share Modal */}
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
            {/* ⭐ Vision Share Card */}
            <VisionShareCard
              postId={postId}
              title={title}
              imageUrl={imageUrl || ""}
              creatorUsername={creatorUsername}
            />

            {/* ⭐ Copy Link Button */}
            <button
              onClick={handleCopy}
              className={`
                w-full px-4 py-2 rounded mt-4 
                text-white transition-all
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

            {/* ⭐ Close */}
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
