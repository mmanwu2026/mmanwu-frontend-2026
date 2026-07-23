"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";

import PlazaCard from "@/components/plaza/PlazaCard";
import VisionCard from "@/app/vision-square/components/VisionCard";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import EnableNotifications from "@/components/EnableNotifications";

/* ---------------------------------------------------------
   Shared Reaction Structure
--------------------------------------------------------- */
interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

const EMPTY_REACTIONS: ReactionCounts = {
  mask1: 0,
  mask2: 0,
  mask3: 0,
  mask4: 0,
  mask5: 0,
  mask6: 0,
};

/* ---------------------------------------------------------
   Unified Feed Item
--------------------------------------------------------- */
interface UnifiedFeedItem {
  square_type: "plaza" | "vision-square" | "sound-square";
  post: any;
  creator: any | null;
  trending_score: number;
}

export default function UnifiedFeedPage() {
  const { supabase, user } = useSupabase();

  const [hydrated, setHydrated] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<string | null>(null);

  const [items, setItems] = useState<UnifiedFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  /* ---------------------------------------------------------
     Hydration
  --------------------------------------------------------- */
  useEffect(() => {
    setHydrated(true);
    const flag =
      typeof window !== "undefined"
        ? localStorage.getItem("notifications_enabled")
        : null;
    setNotificationsEnabled(flag);
  }, []);

  /* ---------------------------------------------------------
     Initial Load
  --------------------------------------------------------- */
useEffect(() => {
  if (!hydrated) return;
  if (!user) return;
  if (items.length === 0 && !loading) {
    loadMore();
  }
}, [hydrated, user]);

  /* ---------------------------------------------------------
     Realtime Reaction Updates
  --------------------------------------------------------- */
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("realtime-reactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;

          const { post_id, post_type, maskTier } = row;
          if (!post_id || !post_type || !maskTier) return;

          if (!items.length) return;

          setItems((prev) =>
            prev.map((item) => {
              const match =
                (post_type === "plaza" && item.square_type === "plaza") ||
                (post_type === "sound" && item.square_type === "sound-square") ||
                (post_type === "vision" && item.square_type === "vision-square");

              if (!match || item.post.id !== post_id) return item;

              const reactions: ReactionCounts = {
                ...EMPTY_REACTIONS,
                ...(item.post.reactions ?? {}),
              };

              const key = `mask${maskTier}` as keyof ReactionCounts;

              if (payload.eventType === "INSERT") {
                reactions[key] = (reactions[key] ?? 0) + 1;
              } else if (payload.eventType === "DELETE") {
                reactions[key] = Math.max(0, (reactions[key] ?? 0) - 1);
              }

              const total =
                reactions.mask1 +
                reactions.mask2 +
                reactions.mask3 +
                reactions.mask4 +
                reactions.mask5 +
                reactions.mask6;

              const spirit =
                reactions.mask1 * 1 +
                reactions.mask2 * 2 +
                reactions.mask3 * 3 +
                reactions.mask4 * 4 +
                reactions.mask5 * 5 +
                reactions.mask6 * 6;

              const positiveCount =
                reactions.mask3 +
                reactions.mask4 +
                reactions.mask5 +
                reactions.mask6;

              const positivity = total > 0 ? positiveCount / total : 0.5;

              let automask = 2;
              if (spirit > 500) automask = 6;
              else if (spirit > 300) automask = 5;
              else if (spirit > 100) automask = 4;
              else if (spirit > 20) automask = 3;

              return {
                ...item,
                post: {
                  ...item.post,
                  reactions,
                  spirit_score: spirit,
                  positivity_ratio: positivity,
                  total_reactions: total,
                  automask,
                },
              };
            })
          );
        }
      );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [supabase, items.length]);

  /* ---------------------------------------------------------
     Load More
  --------------------------------------------------------- */
  async function loadMore() {
    if (loading || !supabase) return;
    setLoading(true);

    /* ---------------------------------------------------------
       PLAZA
    --------------------------------------------------------- */
    const plaza = await supabase
      .from("posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const plazaIds = (plaza.data ?? []).map((p: any) => p.id);

    let plazaReactionMap: Record<string, ReactionCounts> = {};

    if (plazaIds.length > 0) {
      const { data: plazaReactionRows } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", plazaIds)
        .eq("post_type", "plaza");

      plazaIds.forEach((id) => {
        plazaReactionMap[id] = { ...EMPTY_REACTIONS };
      });

      plazaReactionRows?.forEach((r) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        plazaReactionMap[r.post_id][key] += 1;
      });
    }

    const plazaMapped: UnifiedFeedItem[] =
      plaza.data?.map((p: any) => {
        const reactions = plazaReactionMap[p.id] ?? { ...EMPTY_REACTIONS };

        const total =
          reactions.mask1 +
          reactions.mask2 +
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const spirit =
          reactions.mask1 * 1 +
          reactions.mask2 * 2 +
          reactions.mask3 * 3 +
          reactions.mask4 * 4 +
          reactions.mask5 * 5 +
          reactions.mask6 * 6;

        const positiveCount =
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const positivity = total > 0 ? positiveCount / total : 0.5;

        let automask = 2;
        if (spirit > 500) automask = 6;
        else if (spirit > 300) automask = 5;
        else if (spirit > 100) automask = 4;
        else if (spirit > 20) automask = 3;

        return {
          square_type: "plaza",
          post: {
            ...p,
            reactions,
            spirit_score: spirit,
            positivity_ratio: positivity,
            total_reactions: total,
            automask,
            creator_id: p.creator_id,
            creator_privacy_type: p.profiles?.privacy_type ?? "public",
            users: {
              username: p.profiles?.username ?? "unknown",
              avatar_url: p.profiles?.avatar_url ?? null,
            },
          },
          creator: p.profiles,
          trending_score: p.trending_score ?? 0,
        };
      }) ?? [];

    /* ---------------------------------------------------------
       VISION — ⭐ FIXED VERSION
    --------------------------------------------------------- */
    const vision = await supabase
      .from("vision_posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const visionIds = (vision.data ?? []).map((p: any) => p.id);
    const visionCreatorIds = (vision.data ?? []).map((p: any) => p.creator_id);

    let visionReactionMap: Record<string, ReactionCounts> = {};
    let visionPrivacyMap: Record<string, string> = {};

    if (visionCreatorIds.length > 0) {
      const { data: visionCreators } = await supabase
        .from("profiles")
        .select("id, privacy_type")
        .in("id", visionCreatorIds);

      visionCreators?.forEach((c) => {
        visionPrivacyMap[c.id] = c.privacy_type ?? "public";
      });
    }

    if (visionIds.length > 0) {
      const { data: visionReactionRows } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", visionIds)
        .eq("post_type", "vision");

      visionIds.forEach((id) => {
        visionReactionMap[id] = { ...EMPTY_REACTIONS };
      });

      visionReactionRows?.forEach((r) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        visionReactionMap[r.post_id][key] += 1;
      });
    }

    const visionMapped: UnifiedFeedItem[] =
      vision.data?.map((p: any) => {
        const reactions = visionReactionMap[p.id] ?? { ...EMPTY_REACTIONS };

        const total =
          reactions.mask1 +
          reactions.mask2 +
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const spirit =
          reactions.mask1 * 1 +
          reactions.mask2 * 2 +
          reactions.mask3 * 3 +
          reactions.mask4 * 4 +
          reactions.mask5 * 5 +
          reactions.mask6 * 6;

        const positiveCount =
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const positivity = total > 0 ? positiveCount / total : 0.5;

        let automask = 2;
        if (spirit > 500) automask = 6;
        else if (spirit > 300) automask = 5;
        else if (spirit > 100) automask = 4;
        else if (spirit > 20) automask = 3;

        return {
          square_type: "vision-square",
          post: {
            ...p,
            reactions,
            spirit_score: spirit,
            positivity_ratio: positivity,
            total_reactions: total,
            reaction_count: total,
            automask,
            creator_id: p.creator_id,
            creator_privacy_type: visionPrivacyMap[p.creator_id] ?? "public",
            users: {
              username: p.profiles?.username ?? "unknown",
              avatar_url: p.profiles?.avatar_url ?? null,
            },
            is_follower: false,
          },
          creator: p.profiles,
          trending_score: p.trending_score ?? 0,
        };
      }) ?? [];

    /* ---------------------------------------------------------
       SOUND
    --------------------------------------------------------- */
    const sound = await supabase
      .from("sound_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const soundIds = (sound.data ?? []).map((p: any) => p.id);
    const soundCreatorIds = (sound.data ?? []).map((p: any) => p.creator_id);

    let soundReactionMap: Record<string, ReactionCounts> = {};
    let soundPrivacyMap: Record<string, string> = {};

    if (soundCreatorIds.length > 0) {
      const { data: soundCreators } = await supabase
        .from("profiles")
        .select("id, privacy_type")
        .in("id", soundCreatorIds);

      soundCreators?.forEach((c) => {
        soundPrivacyMap[c.id] = c.privacy_type ?? "public";
      });
    }

    if (soundIds.length > 0) {
      const { data: soundReactionRows } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", soundIds)
        .eq("post_type", "sound");

      soundIds.forEach((id) => {
        soundReactionMap[id] = { ...EMPTY_REACTIONS };
      });

      soundReactionRows?.forEach((r) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        soundReactionMap[r.post_id][key] += 1;
      });
    }

    let soundCommentMap: Record<string, any[]> = {};
    soundIds.forEach((id) => (soundCommentMap[id] = []));

    if (soundIds.length > 0) {
      const { data: soundComments } = await supabase
        .from("sound_post_comments")
        .select("*, users(*)")
        .in("post_id", soundIds)
        .order("created_at", { ascending: true });

      soundComments?.forEach((c) => {
        soundCommentMap[c.post_id].push(c);
      });
    }

    const soundMapped: UnifiedFeedItem[] =
      sound.data?.map((p: any) => {
        const reactions = soundReactionMap[p.id] ?? { ...EMPTY_REACTIONS };

        const total =
          reactions.mask1 +
          reactions.mask2 +
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const spirit =
          reactions.mask1 * 1 +
          reactions.mask2 * 2 +
          reactions.mask3 * 3 +
          reactions.mask4 * 4 +
          reactions.mask5 * 5 +
          reactions.mask6 * 6;

        const positiveCount =
          reactions.mask3 +
          reactions.mask4 +
          reactions.mask5 +
          reactions.mask6;

        const positivity = total > 0 ? positiveCount / total : 0.5;

        let automask = 2;
        if (spirit > 500) automask = 6;
        else if (spirit > 300) automask = 5;
        else if (spirit > 100) automask = 4;
        else if (spirit > 20) automask = 3;

        return {
          square_type: "sound-square",
          post: {
            ...p,
            reactions,
            spirit_score: spirit,
            positivity_ratio: positivity,
            total_reactions: total,
            automask,
            comments: soundCommentMap[p.id] || [],
            creator_id: p.creator_id,
            creator_privacy_type: soundPrivacyMap[p.creator_id] ?? "public",
            users: {
              username: "unknown",
              avatar_url: null,
            },
          },
          creator: null,
          trending_score: p.trending_score ?? 0,
        };
      }) ?? [];

    /* ---------------------------------------------------------
       Combine
    --------------------------------------------------------- */
    const combined = [...items, ...plazaMapped, ...visionMapped, ...soundMapped];

    /* ---------------------------------------------------------
       Privacy Enforcement
    --------------------------------------------------------- */
    const viewerId = user?.id ?? null;

    let followMap: Record<string, boolean> = {};

    if (viewerId) {
      const creatorIds = Array.from(
        new Set(
          combined
            .map((item) => item.post.creator_id)
            .filter((id: string | undefined) => !!id)
        )
      ) as string[];

      if (creatorIds.length > 0) {
        const { data: followRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .in("following_id", creatorIds);

        followRows?.forEach((f) => {
          followMap[f.following_id] = true;
        });
      }
    }

    const filtered = combined.filter((item) => {
      const creatorId = item.post.creator_id;
      const privacy =
        item.post.creator_privacy_type ??
        item.creator?.privacy_type ??
        "public";

      if (!creatorId) return true;

      const isOwner = viewerId != null && viewerId === creatorId;
      const isFollowing = viewerId != null && !!followMap[creatorId];

      if (privacy === "private" && !isOwner && !isFollowing) {
        return false;
      }

      return true;
    });

    /* ---------------------------------------------------------
       Sort
    --------------------------------------------------------- */
    filtered.sort((a, b) => {
      const timeA = new Date(a.post.created_at).getTime();
      const timeB = new Date(b.post.created_at).getTime();
      const scoreA = a.trending_score * 0.6 + timeA * 0.4;
      const scoreB = b.trending_score * 0.6 + timeB * 0.4;
      return scoreB - scoreA;
    });

    setItems(filtered);
    setOffset(offset + LIMIT);
    setLoading(false);
  }

  /* ---------------------------------------------------------
     Delete Handler
  --------------------------------------------------------- */
  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.post.id !== id));
  }

  /* ---------------------------------------------------------
     ⭐ Unified Vision Reaction Handler
  --------------------------------------------------------- */
  async function handleUnifiedVisionReaction(postId: string, maskTier: number) {
    if (!user?.id) return;

    await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "vision",
      user_id: user.id,
      maskTier,
    });

    await loadMore(); // refresh unified feed
  }

  /* ---------------------------------------------------------
     Hydration Guard
  --------------------------------------------------------- */
  if (!hydrated) {
    return <div style={{ background: "black", height: "100vh", width: "100vw" }} />;
  }

   /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  return (
    <div className="p-4 pb-24">
      {notificationsEnabled !== "true" && (
        <div className="mb-4 p-3 bg-purple-900/40 border border-purple-700 rounded-lg text-purple-200 text-sm">
          Notifications are off.
          <a href="/notifications" className="underline ml-1">
            Enable them?
          </a>
        </div>
      )}

      <h1
        className="text-3xl font-extrabold tracking-tight mb-6 
                   bg-gradient-to-r from-purple-400 to-pink-300 
                   bg-clip-text text-transparent unified-feed-slide"
      >
        Unified Feed
      </h1>

      <div className="space-y-6">
        {items.map((item) => {
          if (item.square_type === "plaza") {
            if (!item.creator) return null;
            return (
              <PlazaCard
                key={item.post.id}
                post={item.post}
                creator={item.creator}
                userId={user?.id ?? ""}
                onDeleteAction={handleDelete}
                onReactAction={() => {}}
              />
            );
          }

          if (item.square_type === "vision-square") {
            if (!item.creator) return null;
            return (
              <VisionCard
                key={item.post.id}
                post={item.post}
                authUserId={user?.id ?? null}
                is_follower={item.post.is_follower ?? false}
                onReactAction={(maskTier) =>
                  handleUnifiedVisionReaction(item.post.id, maskTier)
                }
              />
            );
          }

          if (item.square_type === "sound-square") {
            return (
              <SoundPostCard
                key={item.post.id}
                post={{ ...item.post, onDeleted: handleDelete }}
                isTrending={item.trending_score > 5}
              />
            );
          }

          return null;
        })}
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={loadMore}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          {loading ? "Loading…" : "Load More"}
        </button>
      </div>
    </div>
  );
}
