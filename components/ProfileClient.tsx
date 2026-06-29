"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import PostCard from "@/components/plaza/PostCard";
import AvatarUploader from "@/components/AvatarUploader";
import Modal from "@/components/ui/Modal";
import EditProfileForm from "@/components/profile/EditProfileForm";
import type { CardSoundPost, ReactionCounts } from "@/app/sound-square/loadSoundPosts";

// ⭐ NEW — Import SoundPostCard
import SoundPostCard from "@/components/sound-square/SoundPostCard";

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
  followers_count: number;
  following_count: number;
};

type Post = {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number | null;
  positivity_ratio: number;
};

type ReactionCountsMap = Record<string, typeof EMPTY_REACTIONS>;

export default function ProfileClient({
  profile,
  posts,
}: {
  profile: Profile;
  posts: Post[];
}) {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "soundposts" | "reactions">("posts");
  const [gridMode, setGridMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCountsMap>({});
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState(profile.followers_count);
  const [followingCount, setFollowingCount] = useState(profile.following_count);
  const [busy, setBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [givenReactions, setGivenReactions] = useState<any[]>([]);

  // ⭐ NEW — Sound-Square posts state
  const [soundPosts, setSoundPosts] = useState<CardSoundPost[]>([]);

  const isOwnProfile = hydrated && user?.id === profile.id;

  const bannerColor = MASK_TIER_COLORS[profile.mask_tier] ?? "#000000";

  useEffect(() => setHydrated(true), []);

   // ⭐ Load Sound-Square posts with real emotional engine
  useEffect(() => {
    async function loadSoundPosts() {
      const { data, error } = await supabase
        .from("sound_posts")
        .select(`
          id,
          title,
          audio_url,
          creator_id,
          creator_name,
          created_at
        `)
        .eq("creator_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("SoundPosts load error:", error);
        return;
      }

      // Collect IDs
      const ids = (data || []).map((p: any) => p.id);

      // Fetch reactions for these sound posts
      const { data: reactionsRows, error: reactionsError } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .in("post_id", ids)
        .eq("post_type", "sound");

      if (reactionsError) {
        console.error("SoundPosts reactions load error:", reactionsError);
      }

      // Map posts with emotional engine
const mapped: CardSoundPost[] = (data || []).map((p: any) => {
  const postReactions = (reactionsRows ?? []).filter(
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

  const spirit_score = postReactions.reduce(
    (sum: number, r: any) => sum + r.maskTier,
    0
  );

  const total = postReactions.length;
  const positive = postReactions.filter((r: any) => r.maskTier >= 3).length;
  const positivity_ratio = total > 0 ? positive / total : 0.5;

  let automask = 2;
  if (spirit_score > 20) automask = 3;
  if (spirit_score > 100) automask = 4;
  if (spirit_score > 300) automask = 5;
  if (spirit_score > 500) automask = 6;

  return {
    id: p.id,
    title: p.title ?? "",
    audio_url: p.audio_url ?? "",
    creator_id: p.creator_id ?? "",
    created_at: p.created_at ?? "",

    // ⭐ MUST BE SNAKE_CASE — matches SoundPostCard + RPC + DB
    spirit_score,
    positivity_ratio,
    automask,

    reactions: counts,

    users: {
      username: p.creator_name ?? "Unknown",
      avatar_url: null,
    },
  };
});

      setSoundPosts(mapped);
    }

    loadSoundPosts();
  }, [profile.id, supabase]);

  // Load follow state
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

  // Follow toggle
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

// Load reactions ON plaza posts
useEffect(() => {
  async function loadReactions() {
    if (!posts || posts.length === 0) return;

    const { data, error } = await supabase
      .from("reactions")
      .select("post_id, maskTier")
      .in("post_id", posts.map((p) => p.id))
      .eq("post_type", "plaza");

    if (error) {
      console.error("Reaction load error:", error);
      return;
    }

    const map: ReactionCountsMap = {};

    (data || []).forEach((r: { post_id: string; maskTier: number }) => {
      if (!map[r.post_id]) map[r.post_id] = { ...EMPTY_REACTIONS };

      const key = `mask${r.maskTier}` as keyof typeof EMPTY_REACTIONS;
      map[r.post_id][key] += 1;
    });

    setReactionCounts(map);
  }

  loadReactions();
}, [posts, supabase]);

// Load reactions GIVEN by this user (FK‑free)
useEffect(() => {
  async function loadGivenReactions() {
    const { data, error } = await supabase
      .from("reactions")
      .select(`
        id,
        maskTier,
        created_at,
        post_id,
        post_type
      `)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGivenReactions(data);
    }
  }

  loadGivenReactions();
}, [profile.id, supabase]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (userLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!user && !userLoading) {
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
        <div className="h-32 w-full" style={{ backgroundColor: bannerColor }} />

        <div className="px-6 -mt-12 flex flex-row gap-8 items-start">
          {/* LEFT COLUMN — AVATAR */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-neutral-900">
              {isOwnProfile ? (
                <AvatarUploader userId={profile.id} currentAvatar={profile.avatar_url} />
              ) : (
                <img
                  src={profile.avatar_url || FALLBACK_AVATAR}
                  onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {isOwnProfile && (
              <button
                onClick={() => document.getElementById("avatar-upload-input")?.click()}
                className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition text-white"
              >
                Upload Avatar
              </button>
            )}
          </div>

          {/* RIGHT COLUMN — INFO */}
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{profile.display_name}</h1>

              {profile.verified && (
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-xs px-2 py-0.5 font-semibold">
                  ✔
                </span>
              )}

              <span
                className="inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 font-semibold border border-white/40"
                style={{
                  backgroundColor: MASK_TIER_COLORS[profile.mask_tier],
                  color: profile.mask_tier === 1 ? "#FFFFFF" : "#000000",
                }}
              >
                Tier {profile.mask_tier}
              </span>
            </div>

            <p className="text-white/60">@{profile.username}</p>

            {profile.bio && (
              <p className="mt-2 text-white/80 max-w-xl leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-row flex-wrap justify-between gap-y-4 mt-4 text-sm text-white/80 max-w-xl">
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
                  {Math.round(profile.positivity_ratio * 100)}%
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

            {/* Location + Website */}
            <div className="mt-4 flex flex-row justify-end w-full">
              <div className="flex flex-col items-end gap-1 text-sm text-neutral-300">
                <div className="flex items-center gap-1">
                  <span>📍</span>
                  {profile.location ? (
                    <span>{profile.location}</span>
                  ) : (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-white/40 italic hover:text-white/70 transition"
                    >
                      Add location
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span>🌐</span>
                  {profile.website_url ? (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {profile.website_url}
                    </a>
                  ) : (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-white/40 italic hover:text-white/70 transition"
                    >
                      Add website
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile */}
            {user?.id === profile.id && (
              <button
                onClick={() => setShowEditModal(true)}
                className="mt-4 inline-block px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white"
              >
                Edit Profile
              </button>
            )}

            {/* Follow button */}
            {user?.id !== profile.id && (
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
      </div>

      {/* CONTENT BELOW */}
      <div className="min-h-screen bg-black text-white p-6 space-y-8">
        {/* Tabs */}
        <div className="flex justify-center gap-6 border-b border-white/10 pb-2 text-sm">
          <button
            onClick={() => setActiveTab("posts")}
            className={activeTab === "posts" ? "text-white font-semibold" : "text-white/50"}
          >
            Posts
          </button>

          <button
            onClick={() => setActiveTab("soundposts")}
            className={activeTab === "soundposts" ? "text-white font-semibold" : "text-white/50"}
          >
            Soundposts
          </button>

          <button
            onClick={() => setActiveTab("reactions")}
            className={activeTab === "reactions" ? "text-white font-semibold" : "text-white/50"}
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
          {/* PLAZA POSTS */}
          {activeTab === "posts" && (
            <div className={gridMode ? "grid grid-cols-2 gap-4" : "space-y-6"}>
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
                        creator_id: post.creator_id,
                        content: post.content,
                        created_at: post.created_at,
                        spirit_score: post.spirit_score,
                        autoMask: post.automask ?? 0,
                      }}
                      reactions={reactionCounts[post.id] ?? EMPTY_REACTIONS}
                      positivityRatio={post.positivity_ratio}
                      onReact={() => {}}
                      showDelete={user?.id === profile.id}
                      onDelete={async (postId) => {
                        await supabase.from("posts").delete().eq("id", postId);
                        router.refresh();
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-white/40 text-center">No posts yet…</p>
              )}
            </div>
          )}

          {/* SOUND-SQUARE POSTS */}
          {activeTab === "soundposts" && (
            <div className="space-y-6">
              {soundPosts && soundPosts.length > 0 ? (
                soundPosts.map((post) => (
                  <SoundPostCard
                    key={post.id}
                    post={post}
                    isTrending={false}   // ⭐ No glyph inside profile
                  />
                ))
              ) : (
                <p className="text-white/40 text-center mt-6">No soundposts yet…</p>
              )}
            </div>
          )}

{/* REACTIONS */}
{activeTab === "reactions" && (
  <div className="space-y-4">
    {givenReactions.length === 0 ? (
      <p className="text-white/40 text-center mt-6">No reactions yet…</p>
    ) : (
      givenReactions.map((r) => {
        // ⭐ Determine post type
        const postType = r.post_type;

        // ⭐ FK-free username + content lookup
        let username = "unknown";
        let content = "";

        if (postType === "plaza") {
          // Plaza posts are already loaded in `posts`
          const p = posts.find((x) => x.id === r.post_id);
          username = p?.creator_id ?? "unknown";
          content = p?.content ?? "";
        }

        if (postType === "sound") {
          const p = soundPosts.find((x) => x.id === r.post_id);
          username = p?.users?.username ?? "unknown";
          content = p?.title ?? "";
        }

        if (postType === "vision") {
          // Vision posts are not loaded here → minimal fallback
          username = "vision_creator";
          content = "Vision post";
        }

        return (
          <div
            key={r.id}
            className="border border-white/10 rounded-lg p-4 bg-neutral-900/40"
          >
            <p className="text-sm text-white/70 mb-2">
              You reacted{" "}
              <span className="font-semibold text-white">
                Mask {r.maskTier}
              </span>{" "}
              to{" "}
              <span className="font-semibold">@{username}</span>
            </p>

            <p className="text-white/90 mb-2 italic">
              “{content.slice(0, 120)}…”
            </p>

            <p className="text-xs text-white/40">
              {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        );
      })
    )}
  </div>
)}
        </div>
      </div>
    </>
  );
}

