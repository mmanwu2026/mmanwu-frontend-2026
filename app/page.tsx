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

      plazaReactionRows?.forEach((r: { post_id: string; maskTier: number }) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        plazaReactionMap[r.post_id][key] += 1;
      });
    }

    const plazaMapped: UnifiedFeedItem[] =
      plaza.data?.map((p: any) => {
        const counts = plazaReactionMap[p.id] ?? {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };

        const total =
          counts.mask1 +
          counts.mask2 +
          counts.mask3 +
          counts.mask4 +
          counts.mask5 +
          counts.mask6;

        const spiritFromMasks =
          counts.mask1 * 1 +
          counts.mask2 * 2 +
          counts.mask3 * 3 +
          counts.mask4 * 4 +
          counts.mask5 * 5 +
          counts.mask6 * 6;

        const positivity =
          total > 0
            ? (counts.mask3 + counts.mask4 + counts.mask5 + counts.mask6) / total
            : p.positivity_ratio ?? 0.5;

        return {
          square_type: "plaza",
          post: {
            ...p,
            reactions: counts,
            spirit_score: p.spirit_score ?? spiritFromMasks,
            positivity_ratio: positivity,
            autoMask: p.autoMask ?? 2,
          },
          creator: p.profiles,
          trending_score:
            (p.spirit_score ?? spiritFromMasks) * 0.6 + total * 0.4,
        };
      }) ?? [];

    /* ---------------- VISION ---------------- */

    const vision = await supabase
      .from("vision_posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const visionMapped: UnifiedFeedItem[] =
      vision.data?.map((p: any) => ({
        square_type: "vision-square",
        post: p,
        creator: p.profiles,
        trending_score:
          (p.reactions ?? 0) * 0.6 +
          (p.spirit_score ?? 0) * 0.3 +
          (p.positivity_ratio ?? 0) * 0.1,
      })) ?? [];

    /* ---------------- SOUND ---------------- */

    const sound = await supabase
      .from("sound_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const soundIds = (sound.data ?? []).map((p: any) => p.id);

    let soundReactionMap: Record<string, ReactionCounts> = {};

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

      soundReactionRows?.forEach((r: { post_id: string; maskTier: number }) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        soundReactionMap[r.post_id][key] += 1;
      });
    }

    const soundMapped: UnifiedFeedItem[] =
      sound.data?.map((p: any) => {
        const counts = soundReactionMap[p.id] ?? {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        };

        const spiritFromMasks =
          counts.mask1 * 1 +
          counts.mask2 * 2 +
          counts.mask3 * 3 +
          counts.mask4 * 4 +
          counts.mask5 * 5 +
          counts.mask6 * 6;

        const total =
          counts.mask1 +
          counts.mask2 +
          counts.mask3 +
          counts.mask4 +
          counts.mask5 +
          counts.mask6;

        const positiveCount =
          counts.mask3 + counts.mask4 + counts.mask5 + counts.mask6;

        const positivity =
          total > 0 ? positiveCount / total : p.positivity_ratio ?? 0.5;

        return {
          square_type: "sound-square",
          post: {
            ...p,
            reactions: counts,
            spirit_score: p.spirit_score ?? spiritFromMasks,
            positivity_ratio: positivity,
            automask: p.automask ?? 2,
          },
          creator: null,
          trending_score:
            (p.share_count ?? 0) * 0.4 +
            (p.spirit_score ?? spiritFromMasks) * 0.4 +
            (positivity ?? 0.5) * 0.2,
        };
      }) ?? [];

    /* ---------------- COMBINE ---------------- */

    const combined = [...items, ...plazaMapped, ...visionMapped, ...soundMapped];

    combined.sort((a, b) => {
      const timeA = new Date(a.post.created_at).getTime();
      const timeB = new Date(b.post.created_at).getTime();
      const scoreA = a.trending_score * 0.6 + timeA * 0.4;
      const scoreB = b.trending_score * 0.6 + timeB * 0.4;
      return scoreB - scoreA;
    });

    setItems(combined);
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

  if (notificationsEnabled !== "true") {
    return (
      <div
        style={{
          background: "black",
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "1.5rem",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <img
          src="/icons/icon-192x192.png"
          alt="Mman Plaza"
          style={{ width: 96, height: 96, marginBottom: 20 }}
        />

        <div style={{ marginBottom: 10 }}>
          <strong>Welcome to Mman Plaza</strong>
        </div>

        <div style={{ opacity: 0.8, marginBottom: 30 }}>
          Preparing your experience…
        </div>

        <EnableNotifications />
      </div>
    );
  }

  return (
<div className="p-4 pb-24">
  <h1 className="text-3xl font-extrabold tracking-tight mb-6 
                 bg-gradient-to-r from-purple-400 to-pink-300 
                 bg-clip-text text-transparent">
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
            // reactions are guaranteed above
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
