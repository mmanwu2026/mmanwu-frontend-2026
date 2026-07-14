"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";

import PlazaCard from "@/components/plaza/PlazaCard";
import VisionCard from "@/app/vision-square/components/VisionCard";
import SoundPostCard from "@/components/sound-square/SoundPostCard";

import EnableNotifications from "@/components/EnableNotifications";

interface UnifiedFeedItem {
  square_type: "plaza" | "vision-square" | "sound-square";
  post: any;
  creator: any;
  trending_score: number;
}

export default function UnifiedFeedPage() {
  const { supabase, user } = useSupabase();

  // All hooks must be declared before any conditional return
  const [hydrated, setHydrated] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<string | null>(null);

  const [items, setItems] = useState<UnifiedFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Hydration + notification flag
  useEffect(() => {
    setHydrated(true);
    const flag = localStorage.getItem("notifications_enabled");
    setNotificationsEnabled(flag);
  }, []);

  // Load feed only when notifications are enabled
  useEffect(() => {
    if (notificationsEnabled === "true") {
      loadMore();
    }
  }, [notificationsEnabled]);

  async function loadMore() {
    if (loading) return;
    setLoading(true);

    // Plaza posts
    const plaza = await supabase
      .from("posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    // Vision posts
    const vision = await supabase
      .from("vision_posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    // ⭐ SOUND POSTS — FIXED (no profiles join)
    const sound = await supabase
      .from("sound_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const plazaMapped =
      plaza.data?.map((p: any) => ({
        square_type: "plaza",
        post: p,
        creator: p.profiles,
        trending_score:
          (p.reactions ?? 0) * 0.6 +
          (p.spirit_score ?? 0) * 0.3 +
          (p.positivity_ratio ?? 0) * 0.1,
      })) ?? [];

    const visionMapped =
      vision.data?.map((p: any) => ({
        square_type: "vision-square",
        post: p,
        creator: p.profiles,
        trending_score:
          (p.reactions ?? 0) * 0.6 +
          (p.spirit_score ?? 0) * 0.3 +
          (p.positivity_ratio ?? 0) * 0.1,
      })) ?? [];

    // ⭐ SOUND POSTS — FIXED MAPPING
 const soundMapped =
  sound.data?.map((p: any) => ({
    square_type: "sound-square",
    post: {
      ...p,

      // ⭐ MUST NOT rename this
      automask: p.automask,

      // ⭐ MUST provide default reactions
      reactions: {
        mask1: 0,
        mask2: 0,
        mask3: 0,
        mask4: 0,
        mask5: 0,
        mask6: 0,
      },

      // ⭐ MUST ensure these exist
      spirit_score: p.spirit_score ?? 0,
      positivity_ratio: p.positivity_ratio ?? 0.5,
    },

    creator: null,

    trending_score:
      (p.share_count ?? 0) * 0.4 +
      (p.spirit_score ?? 0) * 0.4 +
      (p.positivity_ratio ?? 0) * 0.2,
  })) ?? [];

    const combined = [...items, ...plazaMapped, ...visionMapped, ...soundMapped];

    // TikTok-style hybrid ranking
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

  // ⭐ Hydration-safe placeholder
  if (!hydrated) {
    return (
      <div
        style={{
          background: "black",
          height: "100vh",
          width: "100vw",
        }}
      />
    );
  }

  // ⭐ Notification gating
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
      <h1 className="text-2xl font-bold mb-4">MMAN PLAZA — Unified Feed</h1>

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
