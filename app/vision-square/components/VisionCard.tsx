"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";

export default function VisionCard({ post }: { post: any }) {
  const supabase = useSupabase();
  const { user } = useUser();

  const [localMask, setLocalMask] = useState(post.automask);
  const [localSpirit, setLocalSpirit] = useState(post.spirit_score);
  const [localPositivity, setLocalPositivity] = useState(post.positivity_ratio);

  const [muted, setMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isVideo =
    post.media_url.endsWith(".mp4") ||
    post.media_url.endsWith(".webm") ||
    post.media_url.endsWith(".mov");

  const isGif = post.media_url.toLowerCase().endsWith(".gif");

  // ⭐ TikTok-style autoplay on scroll
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play();
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [isVideo]);

  // ⭐ Auto-advance to next video when finished
  function handleVideoEnd() {
    if (!cardRef.current) return;

    const allCards = Array.from(document.querySelectorAll("[data-vision-card]"));
    const index = allCards.indexOf(cardRef.current);

    const nextCard = allCards[index + 1];
    if (nextCard) {
      nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function react(maskTier: number) {
    if (!user) return;

    const { data, error } = await supabase.rpc("apply_reaction", {
      post_id: post.id,
      post_type: "vision",
      masktier: maskTier,
      user_id: user.id,
    });

    if (error) {
      console.error(error);
      return;
    }

    setLocalMask(data.newmask);
    setLocalSpirit(data.spirit);
    setLocalPositivity(data.ratio);
  }

  return (
    <div
      ref={cardRef}
      data-vision-card
      className="bg-gray-900 rounded-xl p-4 mb-6 shadow-lg"
    >
      {post.title && (
        <h2 className="text-xl font-semibold mb-3 text-purple-200">
          {post.title}
        </h2>
      )}

      <div className="mb-4 relative">
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={post.media_url}
              muted={muted}
              playsInline
              onEnded={handleVideoEnd}
              className="rounded-lg w-full"
            />

            {/* Mute / Unmute button */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </>
        ) : isGif ? (
          <img src={post.media_url} alt="GIF" className="rounded-lg w-full" />
        ) : (
          <img src={post.media_url} alt="Vision media" className="rounded-lg w-full" />
        )}
      </div>

      <div className="text-gray-300 mb-2">
        <p>SpiritScore: {localSpirit}</p>
        <p>Positivity: {Math.round(localPositivity * 100)}%</p>
        <p>Mask: {localMask}</p>
      </div>

      <div className="flex gap-3 text-xl mt-3">
        <button onClick={() => react(3)}>😊</button>
        <button onClick={() => react(4)}>🤩</button>
        <button onClick={() => react(5)}>😇</button>
        <button onClick={() => react(2)}>😤</button>
        <button onClick={() => react(1)}>😶‍🌫️</button>
        <button onClick={() => react(6)}>🔱</button>
      </div>

      <p className="text-gray-400 text-sm mt-2">
        {new Date(post.created_at).toLocaleString()}
      </p>
    </div>
  );
}
