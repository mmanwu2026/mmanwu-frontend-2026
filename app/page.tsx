"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";

import PlazaCard from "@/components/plaza/PlazaCard";
import VisionCard from "@/app/vision-square/components/VisionCard";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import EnableNotifications from "@/components/EnableNotifications";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface UnifiedFeedItem {
  square_type: "plaza" | "vision-square" | "sound-square";
  post: any;
  creator: any;
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

  /* ---------------- HYDRATION ---------------- */
  useEffect(() => {
    setHydrated(true);
    const flag = localStorage.getItem("notifications_enabled");
    setNotificationsEnabled(flag);
  }, []);

  useEffect(() => {
    if (notificationsEnabled === "true") {
      loadMore();
    }
  }, [notificationsEnabled]);

  /* ⭐⭐⭐ REALTIME REACTION UPDATES — PLAZA + SOUND + VISION ⭐⭐⭐ */
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("realtime-reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;

          const { post_id, post_type, maskTier } = row;
          if (!post_id || !post_type || !maskTier) return;

          setItems((prev) =>
            prev.map((item) => {
              const match =
                (post_type === "plaza" && item.square_type === "plaza") ||
                (post_type === "sound" && item.square_type === "sound-square") ||
                (post_type === "vision" && item.square_type === "vision-square");

              if (!match || item.post.id !== post_id) return item;

              const reactions = { ...item.post.reactions };
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
                trending_score: item.trending_score,
              };
            })
          );
        }
      );

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [supabase]);

  /* ---------------- LOAD MORE ---------------- */
  async function loadMore() {
    if (loading) return;
    setLoading(true);

    /* ---------------- PLAZA ---------------- */
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
        plazaReactionMap[id] = {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };
      });

      plazaReactionRows?.forEach((r) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        plazaReactionMap[r.post_id][key] += 1;
      });
    }

    const plazaMapped: UnifiedFeedItem[] =
      plaza.data?.map((p: any) => {
        const reactions = plazaReactionMap[p.id] ?? {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };

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
          },
          creator: p.profiles,
          trending_score: p.trending_score ?? 0,
        };
      }) ?? [];

    /* ---------------- VISION ---------------- */
    const vision = await supabase
      .from("vision_posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const visionCreatorIds = (vision.data ?? []).map((p: any) => p.creator_id);

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

    const visionMapped: UnifiedFeedItem[] =
      vision.data?.map((p: any) => ({
        square_type: "vision-square",
        post: {
          ...p,
          creator_privacy_type: visionPrivacyMap[p.creator_id] ?? "public",
        },
        creator: p.profiles,
        trending_score: p.trending_score ?? 0,
      })) ?? [];

    /* ---------------- SOUND ---------------- */
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
        soundReactionMap[id] = {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };
      });

      soundReactionRows?.forEach((r) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        soundReactionMap[r.post_id][key] += 1;
      });
    }

    /* ⭐ Fetch comments for sound posts */
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
        const reactions = soundReactionMap[p.id] ?? {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };

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
            creator_privacy_type: soundPrivacyMap[p.creator_id] ?? "public",
          },
          creator: null,
          trending_score: p.trending_score ?? 0,
        };
      }) ?? [];

    /* ---------------- COMBINE ---------------- */
    const combined = [...items, ...plazaMapped, ...visionMapped, ...soundMapped];

    /* ⭐⭐⭐ PRIVACY ENFORCEMENT ⭐⭐⭐ */
    const viewerId = user?.id ?? null;

const filtered = combined.filter((item) => {
  const creator = item.creator;

  // Sound posts → no creator → always allowed
  if (!creator) return true;

  const privacy = creator.privacy_type ?? "public";

  const isOwner =
    viewerId != null &&
    creator.id != null &&
    viewerId === creator.id;

  return !(privacy === "private" && !isOwner);
});

    /* ---------------- SORT AFTER PRIVACY ---------------- */
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

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.post.id !== id));
  }

  function handleReact() {}

  if (!hydrated) {
    return <div style={{ background: "black", height: "100vh", width: "100vw" }} />;
  }

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
            return (
              <PlazaCard
                key={item.post.id}
                post={item.post}
                creator={item.creator}
                userId={user?.id ?? ""}
                onDeleteAction={handleDelete}
                onReactAction={handleReact}
              />
            );
          }

          if (item.square_type === "vision-square") {
            return <VisionCard key={item.post.id} post={item.post} />;
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
