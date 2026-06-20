"use client";

import React, { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactionBar from "@/components/plaza/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";
import type { CSSProperties } from "react";

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  spirit_score: number;
  mask_tier: number;
}

interface PlazaPost {
  id: number;
  creator_id: string;
  content: string;
  created_at: string;
  mask: number | null;
  spirit_score: number | null;
  reactions: any;

  autoMask: number;
  positivityRatio: number;
}

function maskTitle(mask: number) {
  switch (mask) {
    case 1: return "Dark Whisper";
    case 2: return "Fierce Awakener";
    case 3: return "Gentle Riser";
    case 4: return "Radiant Ascender";
    case 5: return "Seraphic Uplifter";
    case 6: return "Divine Apex";
    default: return "Unknown Mask";
  }
}

function auraIntensity(score: number, positivity: number) {
  let level =
    score < 6 ? 0 :
    score < 16 ? 1 :
    score < 31 ? 2 :
    score < 51 ? 3 :
    4;

  if (positivity > 0.6) level++;
  if (positivity < 0.3) level--;

  return Math.max(0, Math.min(4, level));
}

export default function CreatorProfilePage() {
  const supabase = createSupabaseBrowserClient();   // ⭐ FIXED: CREATE CLIENT HERE

  const params = useParams();
  const creatorId = params?.id as string;

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCreator() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", creatorId)
      .single();

    if (!error) setCreator(data);
  }

  async function fetchPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const patched = data.map((p) => {
        const r = p.reactions || {};

        const total =
          (r["1"] ?? 0) +
          (r["2"] ?? 0) +
          (r["3"] ?? 0) +
          (r["4"] ?? 0) +
          (r["5"] ?? 0) +
          (r["6"] ?? 0);

        const positive =
          (r["3"] ?? 0) +
          (r["4"] ?? 0) +
          (r["5"] ?? 0) +
          (r["6"] ?? 0);

        const positivityRatio = total > 0 ? positive / total : 0.5;

        const score = p.spirit_score ?? 0;

        let autoMask = 2;
        if (score <= 20) autoMask = 2;
        else if (score <= 100) autoMask = 3;
        else if (score <= 200) autoMask = 4;
        else if (score <= 500) autoMask = 5;
        else autoMask = 6;

        return {
          ...p,
          autoMask,
          positivityRatio,
          reactions: {
            mask1: r["1"] ?? 0,
            mask2: r["2"] ?? 0,
            mask3: r["3"] ?? 0,
            mask4: r["4"] ?? 0,
            mask5: r["5"] ?? 0,
            mask6: r["6"] ?? 0,
          },
        };
      });

      setPosts(patched);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchCreator();
    fetchPosts();
  }, [creatorId]);

  if (!creator) return <p className="text-gray-300 p-10">Loading creator…</p>;

  return (
    <div className="plaza-background min-h-[180vh] w-full pt-28 pb-32 relative z-0">

      <div className="w-full flex justify-between items-center px-6 mb-10">
        <Link href="/plaza" className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
          ← Back to Plaza
        </Link>
      </div>

      <div className="flex flex-col items-center text-center text-gray-200 mb-12">
        <img
          src={creator.avatar_url || "/default-avatar.png"}
          className="w-20 h-20 rounded-full border border-white/20 object-cover mb-3"
        />
        <h1 className="text-2xl font-bold">{creator.username}</h1>
        <p className="text-sm text-gray-400 mt-1">{creator.bio}</p>
        <p className="text-sm text-gray-400 mt-1">Spirit Score: {creator.spirit_score}</p>
        <p className="text-sm text-gray-400 mt-1">Mask Tier: {creator.mask_tier}</p>
      </div>

      <div className="w-full flex flex-col items-center px-4">
        {loading && <p className="text-gray-300">Loading posts…</p>}

        <div className="space-y-12 w-full flex flex-col items-center">
          {posts.map((post) => {
            const score = post.spirit_score ?? 0;
            const positivityRatio = post.positivityRatio;

            const glyphEmoji =
              post.autoMask === 1 ? "😶‍🌫️" :
              post.autoMask === 2 ? "😤" :
              post.autoMask === 3 ? "😊" :
              post.autoMask === 4 ? "🤩" :
              post.autoMask === 5 ? "😇" :
              post.autoMask === 6 ? "🔱" :
              "😤";

            const intensity = auraIntensity(score, positivityRatio);

            return (
              <div
                key={post.id}
                className={`
                  relative p-8 rounded-2xl transition-all duration-500
                  overflow-visible min-h-[420px] w-[380px] mx-auto flex flex-col items-center
                  plaza-card-base aura-mask-${post.autoMask} aura-intensity-${intensity}
                `}
              >
                <div className="ritual-glyph-container mt-6">
                  <div className="ritual-glyph-levitate">
                    <div className="ritual-flame-ring"></div>
                    <div className="ritual-shadow-floor"></div>
                    <div className="emoji-glyph" style={{ "--float-y": "-40px" } as CSSProperties}>
                      {glyphEmoji}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-sm font-semibold tracking-wide ritual-mask-title">
                    {maskTitle(post.autoMask)}
                  </div>
                </div>

                <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-3 px-4">
                  {post.content}
                </p>

                <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                  <span>Mask: {post.autoMask}</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>

                <div className="mt-6 w-full flex justify-center">
                  <ReactionBar
                    postId={post.id}
                    creatorId={post.creator_id}
                    reactions={post.reactions}
                    positivityRatio={positivityRatio}
                    onReact={fetchPosts}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <FloatingComposer onPost={fetchPosts} />
      </div>
    </div>
  );
}
