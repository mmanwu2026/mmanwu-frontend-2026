"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import ReactionBar from "@/components/ReactionBar";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// -----------------------------
// Helpers
// -----------------------------
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

// -----------------------------
// Main Profile Page
// -----------------------------
export default function ProfilePage() {
  const params = useParams();
  const userId = params?.userId;

  const { user } = useUser();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    try {
      const res = await fetch(`${BACKEND_URL}/users/${userId}`);
      const data = await res.json();
      setProfile(data.user);
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  }

  async function fetchPosts() {
    try {
      const res = await fetch(`${BACKEND_URL}/plaza?creatorId=${userId}`);
      const data = await res.json();

      const patched = data.map((p: any) => {
        const r = p.reactions || {};
        const total =
          (r[1] || 0) +
          (r[2] || 0) +
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0) +
          (r[6] || 0);

        const positive =
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0) +
          (r[6] || 0);

        const positivityRatio = total > 0 ? positive / total : 0.5;

        let autoMask = 2;
        const score = p.spiritScore ?? 0;

        if (score <= 20) autoMask = 2;
        else if (score <= 100) autoMask = 3;
        else if (score <= 200) autoMask = 4;
        else if (score <= 500) autoMask = 5;
        else autoMask = 6;

        return {
          ...p,
          autoMask,
          positivityRatio,
        };
      });

      setPosts(patched);
    } catch (err) {
      console.error("Posts fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [userId]);

  if (!profile) {
    return (
      <div className="plaza-background min-h-screen w-full flex items-center justify-center">
        <p className="text-gray-300">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="plaza-background min-h-screen w-full pt-28 pb-32 relative">

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-6 mb-10">
        <Link href="/plaza" className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
          Mmanwu Plaza
        </Link>

        <Link href="/profile/me" className="text-lg font-semibold text-purple-200 hover:text-purple-300 transition">
          My Profile
        </Link>
      </div>

      {/* PROFILE HEADER */}
      <div className="w-full flex flex-col items-center text-center mb-12">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          className="w-24 h-24 rounded-full border border-white/20 object-cover mb-4"
        />

        <h1 className="text-2xl font-bold text-white">{profile.username}</h1>

        <p className="text-gray-300 mt-1">
          Mask Tier: {profile.mask_tier ?? "?"}
        </p>

        <p className="text-gray-300">
          Spirit Score: {profile.spirit_score ?? 0}
        </p>

        <p className="text-gray-400 mt-3 max-w-md">
          {profile.bio || "No bio provided."}
        </p>
      </div>

      {/* POSTS */}
      <div className="w-full flex flex-col items-center px-4">
        {loading && <p className="text-gray-300">Loading posts…</p>}

        {!loading && posts.length === 0 && (
          <p className="text-gray-300">This user has no posts yet.</p>
        )}

        <div className="space-y-12 w-full flex flex-col items-center">
          {posts.map((post) => {
            const score = post.spiritScore ?? 0;
            const positivityRatio = post.positivityRatio ?? 0.5;
            const intensity = auraIntensity(score, positivityRatio);

            const glyphEmoji =
              post.autoMask === 1 ? "😶‍🌫️" :
              post.autoMask === 2 ? "😤" :
              post.autoMask === 3 ? "😊" :
              post.autoMask === 4 ? "🤩" :
              post.autoMask === 5 ? "😇" :
              post.autoMask === 6 ? "🔱" :
              "😤";

            return (
              <div
                key={post.id}
                className={`
                  relative
                  p-8
                  rounded-2xl
                  transition-all
                  duration-500
                  overflow-visible
                  min-h-[420px]
                  w-[380px]
                  mx-auto
                  flex flex-col items-center

                  plaza-card-base
                  aura-mask-${post.autoMask}
                  aura-intensity-${intensity}
                `}
              >
                {/* GLYPH */}
                <div className="ritual-glyph-container mt-6">
                  <div className="ritual-glyph-levitate">
                    <div className="ritual-flame-ring"></div>
                    <div className="ritual-shadow-floor"></div>
                    <div className="emoji-glyph">
                      {glyphEmoji}
                    </div>
                  </div>
                </div>

                {/* TITLE */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-semibold tracking-wide ritual-mask-title">
                    {maskTitle(post.autoMask)}
                  </div>
                </div>

                {/* CONTENT */}
                <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-3 px-4">
                  {post.content}
                </p>

                {/* FOOTER */}
                <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                  <span>Mask: {post.autoMask}</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>

                {/* REACTIONS */}
                <div className="mt-6 w-full flex justify-center">
                  <ReactionBar
                    postId={String(post.id)}
                    creatorId={post.creatorId}
                    reactions={post.reactions}
                    spiritScore={score}
                    positivityRatio={positivityRatio}
                    onReact={() => fetchPosts()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
