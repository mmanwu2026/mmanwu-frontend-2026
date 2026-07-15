"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PostCard from "@/components/plaza/PostCard";
import AvatarUploader from "@/app/components/AvatarUploader";
import Modal from "@/components/ui/Modal";
import EditProfileForm from "@/components/profile/EditProfileForm";
import type { CardSoundPost, ReactionCounts } from "@/app/sound-square/types";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import VisionCard from "@/app/vision-square/components/VisionCard";

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

interface VisionComment {
  id: string;
  content: string;
  raw_input?: string | null;
  created_at: string;
  automask: number;
  positivity_ratio?: number;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface VisionPost {
  id: string;
  title: string;
  media_url: string | null;
  creator_id: string;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  automask: number;
  tags: string[];
  users: {
    username: string;
    avatar_url: string | null;
  };
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
  total_reactions: number;
  comments: VisionComment[];
  comment_count: number;
}

export default function ProfileClient({
  profile,
  posts,
}: {
  profile: Profile;
  posts: Post[];
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // Auth via Supabase session (replaces useUser)
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user ?? null;
      setAuthUserId(user?.id ?? null);
      setAuthEmail(user?.email ?? null);
      setAuthLoading(false);
    }
    loadSession();
  }, [supabase]);

  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "visionposts" | "soundposts" | "reactions"
  >("posts");
  const [gridMode, setGridMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCountsMap>({});
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState(profile.followers_count);
  const [followingCount, setFollowingCount] = useState(profile.following_count);
  const [busy, setBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [givenReactions, setGivenReactions] = useState<any[]>([]);

  const [soundPosts, setSoundPosts] = useState<CardSoundPost[]>([]);
  const [visionPosts, setVisionPosts] = useState<VisionPost[]>([]);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionFetchingMore, setVisionFetchingMore] = useState(false);
  const [visionEndReached, setVisionEndReached] = useState(false);

  const [reactionPostMap, setReactionPostMap] = useState<
    Record<string, { username: string; content: string }>
  >({});

  const PAGE_SIZE = 10;

  const isOwnProfile = hydrated && authUserId === profile.id;
  const bannerColor = MASK_TIER_COLORS[profile.mask_tier] ?? "#000000";

  useEffect(() => setHydrated(true), []);

  // Load Sound posts
  useEffect(() => {
    async function loadSoundPosts() {
      const { data, error } = await supabase
        .from("sound_posts")
        .select(`
        id,
        title,
        audio_url,
        creator_id,
        created_at,

        profiles:creator_id (
          username,
          avatar_url
        ),

        comments:sound_post_comments (
          id,
          content,
          raw_input,
          created_at,
          automask,
          positivity_ratio,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        )
      `)
        .eq("creator_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) return;

      const ids = (data || []).map((p: any) => p.id);

      const { data: reactionsRows } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .in("post_id", ids)
        .eq("post_type", "sound");

      type ReactionRow = { post_id: string; maskTier: number };

      const mapped: CardSoundPost[] = (data || []).map((p: any) => {
        const postReactions: ReactionRow[] = (reactionsRows ?? []).filter(
          (r: ReactionRow) => r.post_id === p.id
        );

        const counts: ReactionCounts = {
          mask1: postReactions.filter((r: ReactionRow) => r.maskTier === 1).length,
          mask2: postReactions.filter((r: ReactionRow) => r.maskTier === 2).length,
          mask3: postReactions.filter((r: ReactionRow) => r.maskTier === 3).length,
          mask4: postReactions.filter((r: ReactionRow) => r.maskTier === 4).length,
          mask5: postReactions.filter((r: ReactionRow) => r.maskTier === 5).length,
          mask6: postReactions.filter((r: ReactionRow) => r.maskTier === 6).length,
        };

        const spirit_score = postReactions.reduce(
          (sum: number, r: ReactionRow) => sum + r.maskTier,
          0
        );

        const total = postReactions.length;
        const positive = postReactions.filter(
          (r: ReactionRow) => r.maskTier >= 3
        ).length;

        const positivity_ratio = total > 0 ? positive / total : 0.5;

        let automask = 2;
        if (spirit_score > 20) automask = 3;
        if (spirit_score > 100) automask = 4;
        if (spirit_score > 300) automask = 5;
        if (spirit_score > 500) automask = 6;

        const commentList =
          p.comments?.map((c: any) => ({
            id: c.id,
            content: c.content,
            raw_input: c.raw_input ?? null,
            created_at: c.created_at,
            automask: c.automask,
            positivity_ratio: c.positivity_ratio ?? 0.5,
            user_id: c.user_id,
            profiles: {
              username: c.profiles?.username ?? "unknown",
              avatar_url: c.profiles?.avatar_url ?? null,
            },
          })) ?? [];

        return {
          id: p.id,
          title: p.title ?? "",
          audio_url: p.audio_url ?? "",
          creator_id: p.creator_id ?? "",
          creator_name: null,
          created_at: p.created_at ?? "",
          spirit_score,
          positivity_ratio,
          automask,
          reactions: counts,
          users: {
            username: p.profiles?.username ?? "Unknown",
            avatar_url: p.profiles?.avatar_url ?? null,
          },
          comments: commentList,
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
      if (!authUserId || authLoading || isOwnProfile) {
        setIsFollowing(null);
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", authUserId)
        .eq("following_id", profile.id)
        .maybeSingle();

      if (!active) return;

      setIsFollowing(!!data);
    }

    loadFollowState();
    return () => {
      active = false;
    };
  }, [supabase, authUserId, authLoading, profile.id, isOwnProfile]);

  // Follow toggle (migrated from useUser to Supabase session)
  async function handleFollowToggle() {
    if (!authUserId || authLoading || isOwnProfile || busy) return;

    setBusy(true);

    try {
      if (!isFollowing) {
        const { error } = await supabase.from("follows").insert({
          follower_id: authUserId,
          following_id: profile.id,
        });

        if (!error) {
          setIsFollowing(true);
          setFollowersCount((c) => c + 1);

          const { data: sub } = await supabase
            .from("push_subscriptions")
            .select("subscription")
            .eq("user_id", profile.id)
            .single();

          if (sub?.subscription) {
            await fetch(
              "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscription: sub.subscription,
                  payload: {
                    title: "New Follower 👣",
                    body: `${authEmail || "Someone"} started following you`,
                    icon: "/icons/mman-192.png",
                    url: `/profile/${authUserId}`,
                  },
                }),
              }
            );
          }
        }
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", authUserId)
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

  // ⭐ NEW — Start a private conversation with this user
async function startConversation(otherUserId: string) {
  if (!authUserId) return;
  if (!authUserId) return; 

  // 1. Check if conversation already exists
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`user1.eq.${authUserId},user2.eq.${otherUserId}`)
    .or(`user1.eq.${otherUserId},user2.eq.${authUserId}`)
    .limit(1);

  let conversationId;

  if (existing && existing.length > 0) {
    conversationId = existing[0].id;
  } else {
    // 2. Create new conversation
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        user1: authUserId,
        user2: otherUserId,
      })
      .select("id")
      .single();

    conversationId = created.id;
  }

  // 3. Redirect to Messenger
  router.push(`/messenger?chat=${conversationId}`);
}

  // Load reactions ON plaza posts
  useEffect(() => {
    async function loadReactions() {
      if (!posts || posts.length === 0) return;

      const { data } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", posts.map((p) => p.id))
        .eq("post_type", "plaza");

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

  // Load reactions GIVEN by this user (profile owner)
  useEffect(() => {
    async function loadGivenReactions() {
      const { data } = await supabase
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

      if (data) setGivenReactions(data);
    }

    loadGivenReactions();
  }, [profile.id, supabase]);

  // Load Vision posts
  async function fetchVisionPosts(initial = false) {
    if (visionEndReached && !initial) return;

    if (initial) {
      setVisionLoading(true);
      setVisionEndReached(false);
    } else {
      setVisionFetchingMore(true);
    }

    const lastCreatedAt =
      visionPosts.length > 0
        ? visionPosts[visionPosts.length - 1].created_at
        : null;

    let query = supabase
      .from("vision_posts")
      .select(`
        id,
        title,
        media_url,
        creator_id,
        created_at,
        spirit_score,
        positivity_ratio,
        automask,
        tags,

        users:creator_id (
          username,
          avatar_url
        ),

        comments:vision_post_comments (
          id,
          content,
          raw_input,
          created_at,
          automask,
          positivity_ratio,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        )
      `)
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (lastCreatedAt) {
      query = query.lt("created_at", lastCreatedAt);
    }

    const { data } = await query;

    if (!data) {
      setVisionLoading(false);
      setVisionFetchingMore(false);
      return;
    }

    if (data.length < PAGE_SIZE) setVisionEndReached(true);

    const normalized = data.map((post: any) => {
      const creator =
        Array.isArray(post.users) && post.users.length > 0
          ? post.users[0]
          : post.users;

      const comments =
        post.comments?.map((c: any) => {
          const profileObj =
            Array.isArray(c.profiles) && c.profiles.length > 0
              ? c.profiles[0]
              : c.profiles;

          return {
            id: c.id,
            content: c.content,
            raw_input: c.raw_input ?? null,
            created_at: c.created_at,
            automask: c.automask,
            positivity_ratio: c.positivity_ratio ?? 0.5,
            user_id: c.user_id,
            profiles: {
              username: profileObj?.username ?? "unknown",
              avatar_url: profileObj?.avatar_url || FALLBACK_AVATAR,
            },
          };
        }) ?? [];

      return {
        ...post,
        media_url: post.media_url || null,
        tags: Array.isArray(post.tags) ? post.tags : [],
        users: {
          username: creator?.username ?? "unknown",
          avatar_url: creator?.avatar_url || FALLBACK_AVATAR,
        },
        comments,
        comment_count: comments.length,
      };
    });

    const enriched: VisionPost[] = [];

    for (const post of normalized) {
      const { data: reactionRows } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .eq("post_id", post.id)
        .eq("post_type", "vision");

      const rows: { maskTier: number }[] = reactionRows ?? [];

      const counts = {
        mask1: rows.filter((r) => r.maskTier === 1).length,
        mask2: rows.filter((r) => r.maskTier === 2).length,
        mask3: rows.filter((r) => r.maskTier === 3).length,
        mask4: rows.filter((r) => r.maskTier === 4).length,
        mask5: rows.filter((r) => r.maskTier === 5).length,
        mask6: rows.filter((r) => r.maskTier === 6).length,
      };

      const total = rows.length;
      const positiveCount = rows.filter((r) => r.maskTier >= 3).length;
      const positivity = total > 0 ? positiveCount / total : 0.5;

      const spirit = rows.reduce((sum, r) => sum + r.maskTier, 0);

      let autoMask = 2;
      if (spirit > 20) autoMask = 3;
      if (spirit > 100) autoMask = 4;
      if (spirit > 300) autoMask = 5;
      if (spirit > 500) autoMask = 6;

      enriched.push({
        ...post,
        reactions: counts,
        spirit_score: spirit,
        positivity_ratio: positivity,
        automask: autoMask,
        total_reactions: total,
      });
    }

    setVisionPosts((prev) => {
      const map = new Map<string, VisionPost>();
      for (const p of [...prev, ...enriched]) map.set(p.id, p);
      return Array.from(map.values());
    });

    setVisionLoading(false);
    setVisionFetchingMore(false);
  }

  useEffect(() => {
    if (
      activeTab === "visionposts" &&
      visionPosts.length === 0 &&
      !visionLoading
    ) {
      fetchVisionPosts(true);
    }
  }, [activeTab, visionPosts.length, visionLoading]);

  useEffect(() => {
    function onScroll() {
      if (activeTab !== "visionposts") return;
      if (visionEndReached || visionFetchingMore) return;

      const scrollPos =
        window.innerHeight + document.documentElement.scrollTop;
      const bottom = document.documentElement.offsetHeight - 300;

      if (scrollPos >= bottom) fetchVisionPosts(false);
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeTab, visionPosts, visionFetchingMore, visionEndReached]);

  // NEW reactionPostMap loader
  useEffect(() => {
    async function buildMap() {
      if (givenReactions.length === 0) {
        setReactionPostMap({});
        return;
      }

      const plazaIds = givenReactions
        .filter((r) => r.post_type === "plaza")
        .map((r) => r.post_id);

      const soundIds = givenReactions
        .filter((r) => r.post_type === "sound")
        .map((r) => r.post_id);

      const visionIds = givenReactions
        .filter((r) => r.post_type === "vision")
        .map((r) => r.post_id);

      const map: Record<string, { username: string; content: string }> = {};

      if (plazaIds.length > 0) {
        const { data } = await supabase
          .from("posts")
          .select(`
            id,
            content,
            creator_id,
            profiles:creator_id ( username )
          `)
          .in("id", plazaIds);

        (data || []).forEach((p: any) => {
          map[p.id] = {
            username: p.profiles?.username ?? "unknown",
            content: p.content ?? "",
          };
        });
      }

      if (soundIds.length > 0) {
        const { data } = await supabase
          .from("sound_posts")
          .select(`
            id,
            title,
            creator_id,
            profiles:creator_id ( username )
          `)
          .in("id", soundIds);

        (data || []).forEach((p: any) => {
          map[p.id] = {
            username: p.profiles?.username ?? "unknown",
            content: p.title ?? "",
          };
        });
      }

      if (visionIds.length > 0) {
        const { data } = await supabase
          .from("vision_posts")
          .select(`
            id,
            title,
            creator_id,
            users:creator_id ( username )
          `)
          .in("id", visionIds);

        (data || []).forEach((p: any) => {
          map[p.id] = {
            username: p.users?.username ?? "unknown",
            content: p.title ?? "",
          };
        });
      }

      setReactionPostMap(map);
    }

    buildMap();
  }, [givenReactions, supabase]);

  // Recompute Profile Header Stats (Plaza + Sound + Vision)
  useEffect(() => {
    const plazaSpirit = posts.reduce((sum: number, post: Post) => {
      const counts = reactionCounts[post.id] ?? EMPTY_REACTIONS;

      return (
        sum +
        counts.mask1 * 1 +
        counts.mask2 * 2 +
        counts.mask3 * 3 +
        counts.mask4 * 4 +
        counts.mask5 * 5 +
        counts.mask6 * 6
      );
    }, 0);

    const soundSpirit = soundPosts.reduce(
      (sum: number, post: CardSoundPost) => sum + (post.spirit_score ?? 0),
      0
    );

    const visionSpirit = visionPosts.reduce(
      (sum: number, post: VisionPost) => sum + (post.spirit_score ?? 0),
      0
    );

    const totalSpirit = plazaSpirit + soundSpirit + visionSpirit;

    const totalPosts =
      posts.length + soundPosts.length + visionPosts.length;

    const totalPositivity =
      totalPosts > 0 ? profile.positivity_ratio : 0.5;

    profile.spirit_score = totalSpirit;
    profile.positivity_ratio = totalPositivity;
  }, [posts, reactionCounts, soundPosts, visionPosts, profile]);

  if (!hydrated) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
      <p className="text-gray-500 text-sm">Loading profile…</p>
    </div>
  );
}

if (authLoading && !authUserId) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
      <p className="text-gray-500 text-sm">Loading profile…</p>
    </div>
  );
}

if (!authUserId && !authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
      <p className="text-gray-500 text-sm">Redirecting…</p>
    </div>
  );
}

return (
  <>
    {/* HEADER */}
    <div className="w-full bg-white text-gray-900 border-b border-gray-200">
      {/* Banner */}
      <div
        className="h-32 w-full"
        style={{ backgroundColor: bannerColor }}
      />

      {/* Avatar + Info */}
      <div className="px-6 -mt-12 flex flex-row gap-6 items-start">

        {/* LEFT — Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full border-4 border-white overflow-hidden bg-gray-100 shadow-md">
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

          {isOwnProfile && (
            <button
              onClick={() =>
                document.getElementById("avatar-upload-input")?.click()
              }
              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-500 transition"
            >
              Upload Avatar
            </button>
          )}
        </div>

        {/* RIGHT — Info */}
        <div className="flex flex-col flex-1">

          {/* Name + Badges */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {profile.display_name}
            </h1>

            {profile.verified && (
              <span className="inline-flex items-center justify-center rounded-full bg-yellow-400 text-black text-xs px-2 py-0.5 font-semibold">
                ✔
              </span>
            )}

            <span
              className="inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 font-semibold border border-gray-300"
              style={{
                backgroundColor: MASK_TIER_COLORS[profile.mask_tier],
                color: profile.mask_tier === 1 ? "#FFFFFF" : "#000000",
              }}
            >
              Tier {profile.mask_tier}
            </span>
          </div>

          <p className="text-gray-500">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-2 text-gray-700 max-w-xl leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-row flex-wrap justify-between gap-y-4 mt-4 text-sm text-gray-700 max-w-xl">
            <div>
              <p className="text-lg font-semibold text-gray-900">{followersCount}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-900">{followingCount}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-900">{profile.spirit_score}</p>
              <p className="text-xs text-gray-500">Spirit</p>
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-900">
                {Math.round(profile.positivity_ratio * 100)}%
              </p>
              <p className="text-xs text-gray-500">Positivity</p>
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">Joined</p>
            </div>
          </div>

{/* Follow / Edit */}
<div className="mt-4 flex gap-3">

  {!isOwnProfile && authUserId && (
    <button
      onClick={handleFollowToggle}
      disabled={busy || authLoading}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
        isFollowing
          ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
          : "bg-purple-600 text-white hover:bg-purple-500"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  )}

  {/* ⭐ NEW — MESSAGE BUTTON (Patch 2) */}
  {!isOwnProfile && authUserId && (
    <button
      onClick={() => startConversation(profile.id)}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition"
    >
      Message
    </button>
  )}

  {isOwnProfile && (
    <button
      onClick={() => setShowEditModal(true)}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
    >
      Edit Profile
    </button>
  )}

</div>

        </div>
      </div>
    </div>

    {/* CONTENT BELOW */}
    <div className="min-h-screen bg-white text-gray-900 p-6 space-y-8">

      {/* Tabs */}
      <div className="flex justify-center gap-6 border-b border-gray-200 pb-2 text-sm">
        <button
          onClick={() => setActiveTab("posts")}
          className={
            activeTab === "posts"
              ? "text-purple-700 font-semibold"
              : "text-gray-500"
          }
        >
          Posts
        </button>

        <button
          onClick={() => setActiveTab("visionposts")}
          className={
            activeTab === "visionposts"
              ? "text-purple-700 font-semibold"
              : "text-gray-500"
          }
        >
          Vision Posts
        </button>

        <button
          onClick={() => setActiveTab("soundposts")}
          className={
            activeTab === "soundposts"
              ? "text-purple-700 font-semibold"
              : "text-gray-500"
          }
        >
          Soundposts
        </button>

        <button
          onClick={() => setActiveTab("reactions")}
          className={
            activeTab === "reactions"
              ? "text-purple-700 font-semibold"
              : "text-gray-500"
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
            className="text-xs text-gray-500 hover:text-gray-700 transition"
          >
            {gridMode ? "List View" : "Grid View"}
          </button>
        </div>
      )}

      {/* PLAZA POSTS */}
      {activeTab === "posts" && (
        <div className={gridMode ? "grid grid-cols-2 gap-4" : "space-y-6"}>
          {posts && posts.length > 0 ? (
            posts.map((post) => {
              const counts = reactionCounts[post.id] ?? EMPTY_REACTIONS;

              const total =
                counts.mask1 +
                counts.mask2 +
                counts.mask3 +
                counts.mask4 +
                counts.mask5 +
                counts.mask6;

              const spirit_score =
                1 * counts.mask1 +
                2 * counts.mask2 +
                3 * counts.mask3 +
                4 * counts.mask4 +
                5 * counts.mask5 +
                6 * counts.mask6;

              const positive =
                counts.mask3 + counts.mask4 + counts.mask5 + counts.mask6;

              const positivity_ratio = total > 0 ? positive / total : 0.5;

              let autoMask = 2;
              if (spirit_score > 20) autoMask = 3;
              if (spirit_score > 100) autoMask = 4;
              if (spirit_score > 300) autoMask = 5;
              if (spirit_score > 500) autoMask = 6;

              return (
                <div
                  key={post.id}
                  className={
                    gridMode
                      ? "animate-fadeInUp"
                      : "pb-4 border-b border-gray-200 last:border-b-0 animate-fadeInUp"
                  }
                >
                  <PostCard
                    post={{
                      id: post.id,
                      creator_id: post.creator_id,
                      content: post.content,
                      created_at: post.created_at,
                      spirit_score,
                      autoMask,
                    }}
                    reactions={counts}
                    positivityRatio={positivity_ratio}
                    onReact={() => {}}
                    showDelete={authUserId === profile.id}
                    onDelete={async (postId) => {
                      await supabase.from("posts").delete().eq("id", postId);
                      router.refresh();
                    }}
                  />
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center">No posts yet…</p>
          )}
        </div>
      )}

      {/* VISION POSTS */}
      {activeTab === "visionposts" && (
        <div className="space-y-6">
          {visionLoading && visionPosts.length === 0 && (
            <p className="text-gray-500 text-center mt-6">
              Loading visions…
            </p>
          )}

          {!visionLoading && visionPosts.length === 0 && (
            <p className="text-gray-500 text-center mt-6">
              No visions yet…
            </p>
          )}

          {visionPosts.map((post) => (
            <VisionCard key={post.id} post={post} smallAvatar />
          ))}

          {visionFetchingMore && (
            <p className="text-gray-500 text-center mt-4">
              Loading more visions…
            </p>
          )}

          {visionEndReached && visionPosts.length > 0 && (
            <p className="text-gray-500 text-center mt-4">
              You’ve reached the end of this creator’s visions.
            </p>
          )}
        </div>
      )}

      {/* SOUND POSTS */}
      {activeTab === "soundposts" && (
        <div className="space-y-6">
          {soundPosts && soundPosts.length > 0 ? (
            soundPosts.map((post) => (
              <SoundPostCard key={post.id} post={post} isTrending={false} />
            ))
          ) : (
            <p className="text-gray-500 text-center mt-6">
              No soundposts yet…
            </p>
          )}
        </div>
      )}

      {/* REACTIONS */}
      {activeTab === "reactions" && (
        <div className="space-y-4">
          {Object.keys(reactionPostMap).length === 0 && (
            <p className="text-gray-500 text-center mt-6">
              Loading reactions…
            </p>
          )}

          {Object.keys(reactionPostMap).length > 0 && (
            <>
              {givenReactions.length === 0 ? (
                <p className="text-gray-500 text-center mt-6">
                  No reactions yet…
                </p>
              ) : (
                givenReactions.map((r) => {
                  const info = reactionPostMap[r.post_id];
                  const username = info?.username ?? "unknown";
                  const content = info?.content ?? "";

                  return (
                    <div
                      key={r.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <p className="text-sm text-gray-700 mb-2">
                        You reacted{" "}
                        <span className="font-semibold text-purple-700">
                          Mask {r.maskTier}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold">@{username}</span>
                      </p>

                      <p className="text-gray-800 mb-2 italic">
                        “{content.slice(0, 120)}…”
                      </p>

                      <p className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>

    {/* Edit Profile Modal */}
    {showEditModal && (
      <Modal onClose={() => setShowEditModal(false)}>
        <EditProfileForm
          profile={profile}
          onClose={() => setShowEditModal(false)}
        />
      </Modal>
    )}
  </>
);
}