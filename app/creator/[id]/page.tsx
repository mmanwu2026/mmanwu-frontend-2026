"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactionBar from "@/components/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// -----------------------------
// Types
// -----------------------------
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
  creatorId: string;
  content: string;
  createdAt: string;
  maskTier: number;
  autoMask: number;
  spiritScore: number;
  positivityRatio: number;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6?: number;
  };
}

// -----------------------------
// Aura Helpers
// -----------------------------
function auraColor(mask: number) {
  switch (mask) {
    case 1: return "#7C3AED";
    case 2: return "#DC2626";
    case 3: return "#22C55E";
    case 4: return "#FACC15";
    case 5: return "#3B82F6";
    case 6: return "#F97316";
    default: return "#22C55E";
  }
}

function auraStyle(score = 0, mask: number) {
  const color = auraColor(mask);

  let intensityLevel =
    score < 6 ? 0 :
    score < 16 ? 1 :
    score < 31 ? 2 : 3;

  if (intensityLevel === 0) return { borderColor: color };
  if (intensityLevel === 1) return {
    borderColor: color,
    animation: "aura-breathe 3s ease-in-out infinite",
  };
  if (intensityLevel === 2) return {
    borderColor: color,
    animation: "aura-breathe 2.4s ease-in-out infinite",
  };
  return {
    borderColor: color,
    animation: "aura-pulse 2s ease-in-out infinite",
  };
}

// -----------------------------
// Creator Profile Page
// -----------------------------
export default function CreatorProfilePage() {
  const params = useParams();
  const creatorId = params?.id as string;

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch creator profile
  async function fetchCreator() {
    const res = await fetch(`${BACKEND_URL}/users/${creatorId}`);
    const data = await res.json();
    setCreator(data.user);
  }

  // Fetch creator posts
  async function fetchCreatorPosts() {
    const res = await fetch(`${BACKEND_URL}/plaza?creatorId=${creatorId}`);
    const data = await res.json();

    const patched: PlazaPost[] = data.map((p: any) => ({
      id: p.id,
      creatorId: p.creatorId,
      content: p.content,
      createdAt: p.createdAt,
      maskTier: p.mask,
      autoMask: p.autoMask ?? p.mask,
      spiritScore: p.spiritScore ?? 0,
      positivityRatio: p.positivityRatio ?? 0.5,
      reactions: {
        mask1: p.reactions?.[1] ?? 0,
        mask2: p.reactions?.[2] ?? 0,
        mask3: p.reactions?.[3] ?? 0,
        mask4: p.reactions?.[4] ?? 0,
        mask5: p.reactions?.[5] ?? 0,
        mask6: p.reactions?.[6] ?? 0,
      },
    }));

    setPosts(patched);
  }

  useEffect(() => {
    async function load() {
      await fetchCreator();
      await fetchCreatorPosts();
      setLoading(false);
    }
    load();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading creator…
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="w-full flex justify-center mt-20 text-red-500">
        Creator not found.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center mt-10 px-4 bg-white pb-20">
      <h1 className="text-2xl font-bold text-black mb-6 text-center">
        Creator Profile
      </h1>

      {/* Creator Header */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-32 h-32 rounded-full border-4 shadow-lg mb-4"
          style={auraStyle(creator.spirit_score, creator.mask_tier)}
        >
          <img
            src={creator.avatar_url || "/default-avatar.png"}
            alt="avatar"
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          {creator.username}
        </h2>

        <p className="text-gray-600 mt-1 text-center max-w-sm">
          {creator.bio || "No bio yet."}
        </p>

        <div className="flex gap-6 mt-4 text-gray-700">
          <div className="text-center">
            <div className="font-bold text-lg">{creator.spirit_score}</div>
            <div className="text-xs uppercase tracking-wide">Spirit Score</div>
          </div>

          <div className="text-center">
            <div className="font-bold text-lg">{creator.mask_tier}</div>
            <div className="text-xs uppercase tracking-wide">Mask Tier</div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Posts by {creator.username}
      </h3>

      {/* Hybrid Layout */}
      {posts.length > 0 && (
        <>
          {/* First post large */}
          <div className="w-full flex justify-center mb-10">
            <LargePostCard post={posts[0]} />
          </div>

          {/* Remaining posts in grid */}
          <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
            {posts.slice(1).map((post) => (
              <SmallPostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}

      {posts.length === 0 && (
        <p className="text-gray-600 mt-10">This creator has no posts yet.</p>
      )}
    </div>
  );
}

// -----------------------------
// Post Card Components
// -----------------------------
function LargePostCard({ post }: { post: PlazaPost }) {
  return (
    <div className="p-6 rounded-2xl bg-white border shadow-md max-w-md w-full">
      <p className="text-gray-800 whitespace-pre-line mb-4">{post.content}</p>
      <ReactionBar
        postId={String(post.id)}
        creatorId={post.creatorId}
        reactions={post.reactions}
        spiritScore={post.spiritScore}
        positivityRatio={post.positivityRatio}
      />
    </div>
  );
}

function SmallPostCard({ post }: { post: PlazaPost }) {
  return (
    <div className="p-4 rounded-xl bg-white border shadow-sm">
      <p className="text-gray-800 text-sm whitespace-pre-line mb-3">
        {post.content}
      </p>
      <ReactionBar
        postId={String(post.id)}
        creatorId={post.creatorId}
        reactions={post.reactions}
        spiritScore={post.spiritScore}
        positivityRatio={post.positivityRatio}
      />
    </div>
  );
}
