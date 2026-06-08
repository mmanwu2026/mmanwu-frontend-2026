// vercel rebuild plaza 003
"use client";

import React, { useEffect, useState } from "react";
import ReactionBar from "@/components/ReactionBar";

/* === Plaza Post Type === */
interface PlazaPost {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  maskTier: number;
  spiritScore: number;
  positivityRatio: number;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
}

export default function PlazaPage() {
  const [posts, setPosts] = useState<PlazaPost[]>([]);

  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await fetch(
          "https://mmanwu-clean-production-6465.up.railway.app/plaza"
        );
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error("Plaza load error:", err);
      }
    }

    loadPosts();
  }, []);

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-6">Mmanwu Plaza</h1>

      {posts.map((post) => {
        /* === C2–C8 CLASS LOGIC === */
        const auraClass = "mask-aura";

        const ascensionClass =
          post.spiritScore > 200
            ? "ascend-tier-4"
            : post.spiritScore > 150
            ? "ascend-tier-3"
            : post.spiritScore > 100
            ? "ascend-tier-2"
            : "ascend-tier-1";

        const surgeClass =
          post.spiritScore > 200
            ? "surge-strong"
            : post.spiritScore > 150
            ? "surge-medium"
            : "surge-weak";

        const emotionClass =
          post.positivityRatio > 0.75
            ? "emotion-boost"
            : post.positivityRatio > 0.55
            ? "emotion-intense"
            : post.positivityRatio < 0.25
            ? "emotion-soft"
            : "emotion-calm";

        return (
          <div
            key={post.id}
            className={`
              bg-[#111] p-4 rounded-xl mb-6
              isolate-layout plaza-card-base

              mask-tier-${post.maskTier}
              ${auraClass}
              ${ascensionClass}
              ${surgeClass}
              ${emotionClass}
            `}
          >
            {/* === POST CONTENT === */}
            <p className="text-gray-200 mb-3">{post.content}</p>

            {/* === POST METADATA === */}
            <div className="text-xs text-gray-500 mb-3">
              <div>Spirit Score: {post.spiritScore}</div>
              <div>Mask: {post.maskTier}</div>
              <div>{new Date(post.createdAt).toLocaleString()}</div>
            </div>

            {/* === REACTION BAR WITH C2 === */}
            <ReactionBar
              postId={post.id}
              userId={post.userId}
              reactions={post.reactions}
              spiritScore={post.spiritScore}
              positivityRatio={post.positivityRatio}
            />
          </div>
        );
      })}
    </div>
  );
}
