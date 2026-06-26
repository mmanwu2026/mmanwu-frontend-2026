"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import PostCard from "@/components/plaza/PostCard";
import AvatarUploader from "@/components/AvatarUploader";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

const MASK_TIER_COLORS: Record<number, string> = {
  1: "#000000",
  2: "#DC2626",
  3: "#22C55E",
  4: "#FACC15",
  5: "#3B82F6",
  6: "#FFFFFF",
};

const EMPTY_REACTIONS = {
  mask1: 0,
  mask2: 0,
  mask3: 0,
  mask4: 0,
  mask5: 0,
  mask6: 0,
};

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  mask_tier: number;
  spirit_score: number;
  positivity_ratio: number;
  created_at: string;

  verified?: boolean;
  location?: string | null;
  website_url?: string | null;
  followers_count?: number;
  following_count?: number;
};

type Post = {
  id: string;
  creator_id: string;   // ⭐ REQUIRED FIX
  content: string;
  created_at: string;
  spirit_score: number;
  mask: number;
  automask: number | null;
  positivity_ratio: number;
};

export default function ProfileClient({
  userId,
  profile,
  posts,
}: {
  userId: string;
  profile: Profile;
  posts: Post[];
}) {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"posts" | "soundposts" | "reactions">("posts");

  const [gridMode, setGridMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Record<string, any>>({});

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState(
    profile.followers_count ?? 0
  );
  const [followingCount, setFollowingCount] = useState(
    profile.following_count ?? 0
  );
  const [busy, setBusy] = useState(false);

  const isOwnProfile = user?.id === profile.id;

  const bannerColor = MASK_TIER_COLORS[profile.mask_tier] ?? "#000000";

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    let active = true;

    async function loadFollowState() {
      if (!user || userLoading || isOwnProfile) {
        setIsFollowing(null);
        return;
      }

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Follow state error:", error);
        setIsFollowing(null);
        return;
      }

      setIsFollowing(!!data);
    }

    loadFollowState();
    return () => {
      active = false;
    };
  }, [supabase, user, userLoading, profile.id, isOwnProfile]);

  async function handleFollowToggle() {
    if (!user || userLoading || isOwnProfile || busy) return;

    setBusy(true);

    try {
      if (!isFollowing) {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: profile.id,
        });

        if (!error) {
          setIsFollowing(true);
          setFollowersCount((c) => c + 1);
        }
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);

        if (!error) {
          setIsFollowing(false);
          setFollowersCount((c) => Math.max(0, c - 1));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    async function loadReactions() {
      if (!posts || posts.length === 0) return;

      const { data, error } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .in("post_id", posts.map((p) => p.id));

      if (error) {
        console.error("Reaction load error:", error);
        return;
      }

      const map: Record<string, any> = {};

      data.forEach((r: { post_id: string; maskTier: number }) => {
        if (!map[r.post_id]) map[r.post_id] = { ...EMPTY_REACTIONS };
        map[r.post_id][`mask${r.maskTier}`] += 1;
      });

      setReactionCounts(map);
    }

    loadReactions();
  }, [posts, supabase]);

  if (!hydrated || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="w-full bg-black text-white">

        {/* Banner */}
        <div
          className="h-32 w-full"
          style={{ backgroundColor: bannerColor }}
        />

        {/* NEW HEADER WRAPPER */}
        <div className="px-6 -mt-12 flex flex-row gap-6 items-start">

          {/* LEFT SIDE — AVATAR + UPLOAD BUTTON */}
          <div className="flex flex-col items-center gap-2">

            {/* Avatar */}
            <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-neutral-900">
              {isOwnProfile ? (
                <AvatarUploader
                  userId={profile.id}
                  currentAvatar={profile.avatar_url}
                />
              ) : (
                <img
                  src={profile.avatar_url || FALLBACK_AVATAR}
                  onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Upload button */}
            {isOwnProfile && (
              <button
                onClick={() =>
                  document.getElementById("avatar-upload-input")?.click()
                }
                className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition text-white"
              >
                Upload Avatar
              </button>
            )}
          </div>

          {/* RIGHT SIDE — USER IDENTITY */}
          <div className="flex flex-col flex-1">

            {/* Name + badges */}
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{profile.display_name}</h1>

              {profile.verified && (
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-xs px-2 py-0.5 font-semibold">
                  ✔
                </span>
              )}

              <span
                className="inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 font-semibold border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{
                  backgroundColor: MASK_TIER_COLORS[profile.mask_tier],
                  color: profile.mask_tier === 1 ? "#FFFFFF" : "#000000",
                }}
              >
                Tier {profile.mask_tier}
              </span>
            </div>

            {/* Username */}
            <p className="text-white/60">@{profile.username}</p>

            {/* Stats */}
            <div className="flex flex-row flex-wrap gap-6 mt-3 text-sm text-white/80">

              <div>
                <p className="text-lg font-semibold">{followersCount}</p>
                <p className="text-xs text-white/60">Followers</p>
              </div>

              <div>
                <p className="text-lg font-semibold">{followingCount}</p>
                <p className="text-xs text-white/60">Following</p>
              </div>

              <div>
                <p className="text-lg font-semibold">{profile.spirit_score}</p>
                <p className="text-xs text-white/60">Spirit</p>
              </div>

              <div>
                <p className="text-lg font-semibold">
                  {Math.round(profile.positivity_ratio)}%
                </p>
                <p className="text-xs text-white/60">Positivity</p>
              </div>

              <div>
                <p className="text-lg font-semibold">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-white/60">Joined</p>
              </div>
            </div>

            {/* Follow button */}
            {!isOwnProfile && (
              <div className="mt-4">
                <button
                  onClick={handleFollowToggle}
                  disabled={busy}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    isFollowing
                      ? "bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700"
                      : "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                  } ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Location + website */}
        {(profile.location || profile.website_url) && (
          <div className="px-6 mt-4 flex flex-row flex-wrap gap-4 text-sm text-neutral-300">
            {profile.location && (
              <div className="flex items-center gap-1">
                <span>📍</span>
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website_url && (
              <div className="flex items-center gap-1">
                <span>🌐</span>
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {profile.website_url}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="px-6 mt-3 text-white/80 leading-relaxed">
            {profile.bio}
          </p>
        )}
      </div>

      {/* ORIGINAL CONTENT BELOW */}
      <div className="min-h-screen bg-black text-white p-6 space-y-8">

        {/* Tabs */}
        <div className="flex justify-center gap-6 border-b border-white/10 pb-2 text-sm">
          <button
            onClick={() => setActiveTab("posts")}
            className={
              activeTab === "posts"
                ? "text-white font-semibold"
                : "text-white/50"
            }
          >
            Posts
          </button>

          <button
            onClick={() => setActiveTab("soundposts")}
            className={
              activeTab === "soundposts"
                ? "text-white font-semibold"
                : "text-white/50"
            }
          >
            Soundposts
          </button>

          <button
            onClick={() => setActiveTab("reactions")}
            className={
              activeTab === "reactions"
                ? "text-white font-semibold"
                : "text-white/50"
            }
          >
            Reactions
          </button>
        </div>

        {/* Grid toggle */}
        {activeTab === "posts" && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setGridMode((prev) => !prev)}
              className="text-xs text-white/60 hover:text-white transition"
            >
              {gridMode ? "List View" : "Grid View"}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="mt-4">
          {activeTab === "posts" && (
            <div
              className={
                gridMode ? "grid grid-cols-2 gap-4" : "space-y-6"
              }
            >
              {posts && posts.length > 0 ? (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className={
                      gridMode
                        ? "animate-fadeInUp"
                        : "pb-4 border-b border-white/10 last:border-b-0 animate-fadeInUp"
                    }
                  >
                    <PostCard
  post={{
    id: post.id,
    creator_id: post.creator_id,   // ✔ FIXED
    content: post.content,
    created_at: post.created_at,
    spirit_score: post.spirit_score,
    autoMask: post.automask ?? 0,
  }}
  reactions={reactionCounts[post.id] ?? EMPTY_REACTIONS}
  positivityRatio={post.positivity_ratio}
  onReact={() => {}}
  showDelete={isOwnProfile}
  onDelete={async (postId) => {
    await supabase.from("posts").delete().eq("id", postId);
    router.refresh();
  }}
/>

                  </div>
                ))
              ) : (
                <p className="text-white/40 text-center">
                  No posts yet…
                </p>
              )}
            </div>
          )}

          {activeTab === "soundposts" && (
            <p className="text-white/40 text-center">
              No soundposts yet…
            </p>
          )}

          {activeTab === "reactions" && (
            <p className="text-white/40 text-center">
              No reactions yet…
            </p>
          )}
        </div>
      </div>
    </>
  );
}
