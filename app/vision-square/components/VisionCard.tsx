"use client";

import React, { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";

export default function VisionCard({ post }: { post: any }) {
  const supabase = useSupabase();
  const { user } = useUser();

  const [localMask, setLocalMask] = useState(post.automask);
  const [localSpirit, setLocalSpirit] = useState(post.spirit_score);
  const [localPositivity, setLocalPositivity] = useState(post.positivity_ratio);

  const isVideo =
    post.media_url.endsWith(".mp4") ||
    post.media_url.endsWith(".webm") ||
    post.media_url.endsWith(".mov");

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

    // Update UI with new emotional engine values
    setLocalMask(data.newmask);
    setLocalSpirit(data.spirit);
    setLocalPositivity(data.ratio);
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-6 shadow-lg">

      {/* ⭐ TITLE (conditionally rendered + Plaza styling) */}
      {post.title && (
        <h2 className="text-xl font-semibold mb-3 text-purple-200">
          {post.title}
        </h2>
      )}

      <div className="mb-4">
        {isVideo ? (
          <video src={post.media_url} controls className="rounded-lg w-full" />
        ) : (
          <img src={post.media_url} alt="Vision media" className="rounded-lg w-full" />
        )}
      </div>

      {/* Emotional Engine */}
      <div className="text-gray-300 mb-2">
        <p>SpiritScore: {localSpirit}</p>
        <p>Positivity: {Math.round(localPositivity * 100)}%</p>
        <p>Mask: {localMask}</p>
      </div>

      {/* Reaction Bar */}
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
