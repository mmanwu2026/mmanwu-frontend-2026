"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactionBar from "@/components/plaza/ReactionBar";
import FloatingComposer from "@/components/plaza/FloatingComposer";
import type { CSSProperties } from "react";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  spirit_score: number;
  mask_tier: number;
}

interface CreatorPost {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;

  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
  glyph: string;
  auraLevel: number;
}

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { supabase } = useSupabase();

  // ⭐ NEW — Supabase session identity
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      setAuthUserId(user?.id ?? null);
      setAuthLoading(false);
    }
    loadSession();
  }, [supabase]);

  // ⭐ Hydration guard
  if (authLoading) {
    return <p className="text-gray-300 p-10">Loading creator…</p>;
  }

  // ⭐ If not logged in → redirect
  if (!authUserId) {
    router.replace("/login");
    return null;
  }

  // ⭐ Resolve ID AFTER hydration
  const actualId =
    params?.id === "me" ? authUserId : (params?.id as string);

  if (!actualId) {
    return <p className="text-gray-300 p-10">Loading creator…</p>;
  }

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [fetching, setFetching] = useState(true);

  // ⭐ Fetch creator + posts
  useEffect(() => {
    async function load() {
      setFetching(true);

      const { data: rows } = await supabase
  .from("users")
  .select("*")
  .eq("id", actualId)
  .limit(1);

const creatorData = rows?.[0] ?? null;

      setCreator(creatorData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", actualId)
        .order("created_at", { ascending: false });

      if (!postsData) {
        setPosts([]);
        setFetching(false);
        return;
      }

      const postIds = postsData.map((p: any) => p.id);

      const { data: reactionsData } = await supabase
        .from("reactions")
        .select("post_id, maskTier, value")
        .in("post_id", postIds);

      const merged: CreatorPost[] = postsData.map((p: any) => {
        const postReactions = (reactionsData ?? []).filter(
          (r: any) => r.post_id === p.id
        );

        const counts: ReactionCounts = {
          mask1: postReactions.filter((r: any) => r.maskTier === 1).length,
          mask2: postReactions.filter((r: any) => r.maskTier === 2).length,
          mask3: postReactions.filter((r: any) => r.maskTier === 3).length,
          mask4: postReactions.filter((r: any) => r.maskTier === 4).length,
          mask5: postReactions.filter((r: any) => r.maskTier === 5).length,
          mask6: postReactions.filter((r: any) => r.maskTier === 6).length,
        };

        const spiritScore = p.spirit_score ?? 0;

        const weightedPositive = postReactions
          .filter((r: any) => (r.value ?? 0) > 0)
          .reduce((sum: number, r: any) => sum + (r.value ?? 0), 0);

        const weightedTotal = Math.abs(spiritScore);
        const positivityRatio =
          weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

        const glyph =
          spiritScore <= 20 ? "😤" :
          spiritScore <= 100 ? "😊" :
          spiritScore <= 300 ? "🤩" :
          spiritScore <= 500 ? "😇" :
          "🔱";

        const auraLevel =
          positivityRatio > 0.7 ? 4 :
          positivityRatio > 0.5 ? 3 :
          positivityRatio > 0.3 ? 2 :
          positivityRatio > 0.1 ? 1 :
          0;

        return {
          ...p,
          reactions: counts,
          spiritScore,
          positivityRatio,
          glyph,
          auraLevel,
        };
      });

      setPosts(merged);
      setFetching(false);
    }

    load();
  }, [actualId, supabase]);

  if (fetching || !creator) {
    return <p className="text-gray-300 p-10">Loading creator…</p>;
  }

  return (
    <div className="plaza-background min-h-[180vh] w-full pt-28 pb-32 relative z-0">

      <div className="w-full flex justify-between items-center px-6 mb-10">
        <Link href="/plaza" className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
          ← Back to Plaza
        </Link>
      </div>

      {/* Creator Header */}
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

      {/* Posts */}
      <div className="w-full flex flex-col items-center px-4">
        <div className="space-y-12 w-full flex flex-col items-center">
          {posts.map((post: CreatorPost) => (
            <div
              key={post.id}
              className={`
                relative p-8 rounded-2xl transition-all duration-500
                overflow-visible min-h-[420px] w-[380px] mx-auto flex flex-col items-center
                plaza-card-base aura-intensity-${post.auraLevel}
              `}
            >
              {/* Glyph */}
              <div className="ritual-glyph-container mt-6">
                <div className="ritual-glyph-levitate">
                  <div className="ritual-flame-ring"></div>
                  <div className="ritual-shadow-floor"></div>
                  <div className="emoji-glyph" style={{ "--float-y": "-40px" } as CSSProperties}>
                    {post.glyph}
                  </div>
                </div>
              </div>

              <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-3 px-4">
                {post.content}
              </p>

              <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                <span>Score: {post.spiritScore}</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
              </div>

              <div className="mt-6 w-full flex justify-center">
                <ReactionBar
                  postType="plaza"
                  postId={post.id}
                  creatorId={post.creator_id}
                  reactions={post.reactions}
                  spiritScore={post.spiritScore}
                  positivityRatio={post.positivityRatio}
                  onReact={() => {}}
                />
              </div>
            </div>
          ))}
        </div>

        <FloatingComposer onPost={() => {}} />
      </div>
    </div>
  );
}
