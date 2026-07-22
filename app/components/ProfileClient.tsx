"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  is_private: boolean;
  privacy_type: "public" | "private";
};

type Post = {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number | null;
  positivity_ratio: number;
  privacy_type: "public" | "private";
};

type ReactionCountsMap = Record<string, ReactionCounts>;

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

export default function ProfileClient({ profileId }: { profileId: string }) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // Auth
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Profile + posts
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // UI + state
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "visionposts" | "soundposts" | "reactions"
  >("posts");

  const [gridMode, setGridMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCountsMap>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [headerSpirit, setHeaderSpirit] = useState(0);
  const [headerPositivity, setHeaderPositivity] = useState(0.5);


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

  // Derived values
  const isOwnProfile = hydrated && authUserId === profile?.id;
  const bannerColor = MASK_TIER_COLORS[profile?.mask_tier ?? 1];

  // Derived values
const viewerIsOwner = authUserId === profile?.id;
const isPrivate = profile?.privacy_type === "private";

// ⭐ Only compute viewerAllowed AFTER follow-state loads
const viewerAllowed =
  profile && authUserId !== null
    ? (!isPrivate || viewerIsOwner || isFollowing)
    : false;

    /* --------------------------------------------- */
  /* AUTH SESSION (Supabase)                       */
  /* --------------------------------------------- */
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

  /* --------------------------------------------- */
  /* LOAD PROFILE + POSTS (CLIENT-SIDE)            */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadProfile() {
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .limit(1);

  if (error) {
    setProfile(null);
    return;
  }

  const p = rows?.[0] ?? null;
  setProfile(p);

  if (p) {
const { data: postRows } = await supabase
  .from("posts")
  .select(`
    id,
    creator_id,
    content,
    created_at,
    spirit_score,
    automask,
    positivity_ratio,
    privacy_type
  `)
  .eq("creator_id", profileId)
  .order("created_at", { ascending: false });

    setPosts(postRows ?? []);
    setFollowersCount(p.followers_count);
    setFollowingCount(p.following_count);
  }
}

    loadProfile();
  }, [profileId, supabase]);

  /* --------------------------------------------- */
  /* HYDRATION FLAG                                */
  /* --------------------------------------------- */
  useEffect(() => {
    setHydrated(true);
  }, []);

 /* --------------------------------------------- */
/* LOAD SOUND POSTS (with privacy enforcement)   */
/* --------------------------------------------- */
useEffect(() => {
  async function loadSoundPosts() {
    if (!profile || !authUserId) return;

    // 1. Load follow-state
    const { data: followRows } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", authUserId)
      .eq("following_id", profile.id)
      .limit(1);

    const isFollowing = !!followRows?.[0];
    const isCreator = authUserId === profile.id;

    // 2. Load sound posts WITH privacy_type
    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        id,
        title,
        audio_url,
        creator_id,
        created_at,
        privacy_type,

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

    // 3. Apply privacy filtering
    const filtered = (data || []).filter((post: any) => {
      if (post.privacy_type === "public") return true;
      if (isCreator) return true;
      if (isFollowing) return true;
      return false;
    });

    const ids = filtered.map((p: any) => p.id);

    // 4. Load reactions
    const { data: reactionsRows } = await supabase
      .from("reactions")
      .select('post_id, "maskTier"')
      .in("post_id", ids)
      .eq("post_type", "sound");

    type ReactionRow = { post_id: string; maskTier: number };

    // 5. Build enriched cards
    const mapped: CardSoundPost[] = filtered.map((p: any) => {
      const postReactions: ReactionRow[] =
        (reactionsRows ?? []).filter((r) => r.post_id === p.id);

      const counts: ReactionCounts = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      const spirit_score = postReactions.reduce(
        (sum, r) => sum + r.maskTier,
        0
      );

      const total = postReactions.length;
      const positive = postReactions.filter((r) => r.maskTier >= 3).length;
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
        privacy_type: p.privacy_type, // ⭐ optional UI use
      };
    });

    setSoundPosts(mapped);
  }

  loadSoundPosts();
}, [profile, authUserId, supabase]);

  /* --------------------------------------------- */
/* LOAD FOLLOW STATE                             */
/* --------------------------------------------- */
useEffect(() => {
  async function loadFollowState() {
    if (!authUserId || !profile) {
      setIsFollowing(false);
      setHasRequested(false);
      return;
    }

    const { data: followRows } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", authUserId)
      .eq("following_id", profile.id)
      .limit(1);

    const followData = followRows?.[0] ?? null;

    if (followData) {
      setIsFollowing(true);
      setHasRequested(false);
      return;
    }

    const { data: requestRows } = await supabase
      .from("follow_requests")
      .select("id")
      .eq("requester_id", authUserId)
      .eq("target_id", profile.id)
      .limit(1);

    setIsFollowing(false);
    setHasRequested(!!requestRows?.[0]);
  }

    if (profile) {
    setFollowersCount(profile.followers_count);
    setFollowingCount(profile.following_count);
  }

  loadFollowState();
}, [authUserId, profile, supabase]);

  /* --------------------------------------------- */
  /* FOLLOW TOGGLE                                  */
  /* --------------------------------------------- */
  async function handleFollowToggle() {
    if (!authUserId || busy || !profile) return;
    setBusy(true);

    try {
      // CASE 1 — Unfollow
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", authUserId)
          .eq("following_id", profile.id);

        setIsFollowing(false);
        setHasRequested(false);
        setFollowersCount((c) => Math.max(0, c - 1));
        return;
      }

      // CASE 2 — Private profile → follow request
      if (profile.privacy_type === "private") {
        await supabase.from("follow_requests").insert({
          requester_id: authUserId,
          target_id: profile.id,
          status: "pending",
        });

        await supabase.from("notifications").insert({
          user_id: profile.id,
          actor_id: authUserId,
          event_type: "follow_request",
          message: "requested to follow you",
        });

        setHasRequested(true);
        setIsFollowing(false);
        return;
      }

      // CASE 3 — Public profile → follow instantly
      await supabase.from("follows").insert({
        follower_id: authUserId,
        following_id: profile.id,
      });

      await supabase.from("notifications").insert({
        user_id: profile.id,
        actor_id: authUserId,
        event_type: "new_follower",
        message: "started following you",
      });

      setIsFollowing(true);
      setHasRequested(false);
      setFollowersCount((c) => c + 1);
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------------------- */
  /* START PRIVATE CONVERSATION                     */
  /* --------------------------------------------- */
  async function startConversation(otherUserId: string) {
    if (authLoading || !authUserId) return;

    const { data: myRooms } = await supabase
      .from("room_participants")
      .select("room_id")
      .eq("user_id", authUserId);

    let roomId: string | null = null;

    if (myRooms && myRooms.length > 0) {
      const roomIds = myRooms.map((r) => r.room_id);

      const { data: sharedRooms } = await supabase
        .from("room_participants")
        .select("room_id")
        .in("room_id", roomIds)
        .eq("user_id", otherUserId)
        .limit(1);

      if (sharedRooms && sharedRooms.length > 0) {
        roomId = sharedRooms[0].room_id;
      }
    }

    if (!roomId) {
  const { data: rows, error } = await supabase
    .from("rooms")
    .insert({
      created_by: authUserId,
      is_group: false,
    })
    .select("id")
    .limit(1);

  if (error) return;

  const newRoom = rows?.[0] ?? null;
  if (!newRoom) return;

  roomId = newRoom.id;

  await supabase.from("room_participants").insert([
    { room_id: roomId, user_id: authUserId },
    { room_id: roomId, user_id: otherUserId },
  ]);
}

router.push(`/messenger/${roomId}`);
  }

  /* --------------------------------------------- */
  /* LOAD REACTIONS ON PLAZA POSTS                  */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadReactions() {
      if (!viewerAllowed || posts.length === 0) return;

      const { data } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", posts.map((p) => p.id))
        .eq("post_type", "plaza");

      const map: ReactionCountsMap = {};

      (data || []).forEach((r: { post_id: string; maskTier: number }) => {
        if (!map[r.post_id]) map[r.post_id] = { ...EMPTY_REACTIONS };
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        map[r.post_id][key] += 1;
      });

      setReactionCounts(map);
    }

    loadReactions();
  }, [posts, supabase, viewerAllowed]);

  /* --------------------------------------------- */
  /* LOAD REACTIONS GIVEN BY PROFILE OWNER          */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadGivenReactions() {
      if (!viewerAllowed || !profile) return;

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
  }, [profile, supabase, viewerAllowed]);

    /* --------------------------------------------- */
  /* LOAD VISION POSTS (WITH PRIVACY PATCH)        */
  /* --------------------------------------------- */
  async function fetchVisionPosts(initial = false) {
    if (!viewerAllowed || !profile) return;
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

    if (data.length < PAGE_SIZE) {
      setVisionEndReached(true);
    }

    /* --------------------------------------------- */
    /* NORMALIZE VISION POSTS                         */
    /* --------------------------------------------- */
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

    /* --------------------------------------------- */
    /* ENRICH VISION POSTS (REACTIONS → SPIRIT)       */
    /* --------------------------------------------- */
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

    /* --------------------------------------------- */
    /* MERGE INTO STATE (DEDUPED)                     */
    /* --------------------------------------------- */
    setVisionPosts((prev) => {
      const map = new Map<string, VisionPost>();
      for (const p of [...prev, ...enriched]) map.set(p.id, p);
      return Array.from(map.values());
    });

    setVisionLoading(false);
    setVisionFetchingMore(false);
  }

  /* --------------------------------------------- */
  /* INITIAL LOAD (PRIVACY PATCHED)                 */
  /* --------------------------------------------- */
  useEffect(() => {
    if (
      viewerAllowed &&
      activeTab === "visionposts" &&
      visionPosts.length === 0 &&
      !visionLoading
    ) {
      fetchVisionPosts(true);
    }
  }, [activeTab, visionPosts.length, visionLoading, viewerAllowed]);

  /* --------------------------------------------- */
  /* INFINITE SCROLL (PRIVACY PATCHED)              */
  /* --------------------------------------------- */
  useEffect(() => {
    function onScroll() {
      if (activeTab !== "visionposts") return;
      if (!viewerAllowed) return;
      if (visionEndReached || visionFetchingMore) return;

      const scrollPos =
        window.innerHeight + document.documentElement.scrollTop;
      const bottom = document.documentElement.offsetHeight - 300;

      if (scrollPos >= bottom) {
        fetchVisionPosts(false);
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [
    activeTab,
    visionPosts,
    visionFetchingMore,
    visionEndReached,
    viewerAllowed,
  ]);

    /* --------------------------------------------- */
  /* BUILD REACTION → POST MAP                     */
  /* --------------------------------------------- */
  useEffect(() => {
    async function buildMap() {
      if (!viewerAllowed) {
        setReactionPostMap({});
        return;
      }

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

      /* PLAZA */
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

      /* SOUND */
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

      /* VISION */
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
  }, [givenReactions, supabase, viewerAllowed]);

  /* --------------------------------------------- */
  /* RECOMPUTE PROFILE HEADER STATS                */
  /* --------------------------------------------- */

useEffect(() => {
  if (!profile) return;

  const plazaSpirit = posts.reduce((sum, post) => {
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
    (sum, post) => sum + (post.spirit_score ?? 0),
    0
  );

  const visionSpirit = visionPosts.reduce(
    (sum, post) => sum + (post.spirit_score ?? 0),
    0
  );

  const totalSpirit = plazaSpirit + soundSpirit + visionSpirit;
  const totalPosts =
    posts.length + soundPosts.length + visionPosts.length;

  const totalPositivity =
    totalPosts > 0 ? profile.positivity_ratio : 0.5;

  setHeaderSpirit(totalSpirit);
  setHeaderPositivity(totalPositivity);
}, [posts, reactionCounts, soundPosts, visionPosts, profile?.positivity_ratio]);

    /* --------------------------------------------- */
  /* HEADER                                        */
  /* --------------------------------------------- */
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        <p className="text-gray-500 text-sm">Profile not found or private.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white text-gray-900 border-b border-gray-200">
        {/* Banner */}
        <div
          className="h-32 w-full"
          style={{ backgroundColor: bannerColor }}
        />

        {/* Avatar + Info */}
        <div className="px-6 -mt-12 flex flex-row gap-6 items-start">
          {/* LEFT — Avatar + Upload + Edit */}
          <div className="flex flex-col items-center gap-3">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full border-4 border-white overflow-hidden bg-gray-100 shadow-md">
              {isOwnProfile ? (
                <AvatarUploader
                  userId={profile.id}
                  currentAvatar={profile.avatar_url}
                />
              ) : (
                <img
                  src={profile.avatar_url || FALLBACK_AVATAR}
                  onError={(e) =>
                    (e.currentTarget.src = FALLBACK_AVATAR)
                  }
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Upload Avatar */}
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

            {/* Edit Profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowEditModal(true)}
                className="text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 transition"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* RIGHT — Info */}
          <div className="flex flex-col flex-1">
            {/* Name + Badges */}
            <div className="flex items-center gap-2">
              <h1 className="mman-username-display">
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
                  color:
                    profile.mask_tier === 1 ? "#FFFFFF" : "#000000",
                }}
              >
                Tier {profile.mask_tier}
              </span>
            </div>

            {/* Handle */}
            <p className="text-gray-600 mt-2 leading-snug mman-username-handle">
              @{profile.username}
            </p>

            {/* BIO */}
            {viewerAllowed && profile.bio && (
              <p className="mt-2 text-gray-700 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {!viewerAllowed && (
              <p className="mt-2 text-gray-500">
                This profile is private.
              </p>
            )}

            {/* Stats */}
            {viewerAllowed && (
              <div className="flex flex-row flex-wrap justify-between gap-y-4 mt-4 text-sm text-gray-700 max-w-xl">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {followersCount}
                  </p>
                  <p className="text-xs text-gray-500">Followers</p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {followingCount}
                  </p>
                  <p className="text-xs text-gray-500">Following</p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {headerSpirit}
                  </p>
                  <p className="text-xs text-gray-500">Spirit</p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.round(headerPositivity * 100)}%
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
            )}

            {/* FOLLOW + MESSAGE */}
            <div className="mt-4 flex flex-row gap-3 items-center">
              {/* Follow Logic */}
              {!isOwnProfile && authUserId && (
                <>
                  {isFollowing && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                    >
                      Following
                    </button>
                  )}

                  {!isFollowing && hasRequested && (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-300 text-gray-600 transition"
                    >
                      Requested
                    </button>
                  )}

                  {!isFollowing && !hasRequested && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
                    >
                      Follow
                    </button>
                  )}
                </>
              )}

              {/* Message */}
              {!isOwnProfile && authUserId && viewerAllowed && (
                <button
                  disabled={!viewerAllowed || authLoading || !authUserId}
                  onClick={() =>
                    viewerAllowed && startConversation(profile.id)
                  }
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Message
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* CONTENT BELOW                                 */}
      {/* --------------------------------------------- */}
      <div className="min-h-screen bg-white text-gray-900 p-6 space-y-8">

        {/* Tabs — privacy patched */}
        <div className="flex justify-center gap-6 border-b border-gray-200 pb-2 text-sm">
          {!viewerAllowed && (
            <p className="text-gray-500 text-center mt-2">
              This profile is private.
            </p>
          )}

          {viewerAllowed && (
            <>
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
            </>
          )}
        </div>

        {/* Grid toggle */}
        {activeTab === "posts" && viewerAllowed && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setGridMode((prev) => !prev)}
              className="text-xs text-gray-500 hover:text-gray-700 transition"
            >
              {gridMode ? "List View" : "Grid View"}
            </button>
          </div>
        )}

        {/* --------------------------------------------- */}
        {/* PLAZA POSTS                                   */}
        {/* --------------------------------------------- */}
        {viewerAllowed && activeTab === "posts" && (
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
                  counts.mask3 +
                  counts.mask4 +
                  counts.mask5 +
                  counts.mask6;

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
                        privacy_type: post.privacy_type,
                      }}
                      reactions={counts}
                      positivityRatio={positivity_ratio}
                      onReactAction={() => {}}
                      showDelete={authUserId === profile.id}
                      onDelete={async (postId) => {
                        await supabase
                          .from("posts")
                          .delete()
                          .eq("id", postId);
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

        {!viewerAllowed && activeTab === "posts" && (
          <p className="text-gray-500 text-center mt-6">
            This profile is private.
          </p>
        )}

        {/* --------------------------------------------- */}
        {/* VISION POSTS                                   */}
        {/* --------------------------------------------- */}
        {viewerAllowed && activeTab === "visionposts" && (
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

        {!viewerAllowed && activeTab === "visionposts" && (
          <p className="text-gray-500 text-center mt-6">
            This profile is private.
          </p>
        )}

        {/* --------------------------------------------- */}
        {/* SOUND POSTS                                    */}
        {/* --------------------------------------------- */}
        {viewerAllowed && activeTab === "soundposts" && (
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

        {!viewerAllowed && activeTab === "soundposts" && (
          <p className="text-gray-500 text-center mt-6">
            This profile is private.
          </p>
        )}

        {/* --------------------------------------------- */}
        {/* REACTIONS                                      */}
        {/* --------------------------------------------- */}
        {viewerAllowed && activeTab === "reactions" && (
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

        {!viewerAllowed && activeTab === "reactions" && (
          <p className="text-gray-500 text-center mt-6">
            This profile is private.
          </p>
        )}
      </div>

      {/* --------------------------------------------- */}
      {/* EDIT PROFILE MODAL                            */}
      {/* --------------------------------------------- */}
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
