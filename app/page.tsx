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

  if (!hydrated) return null;

  // Gate: ask for notifications before showing feed
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

  // Load initial batch once notifications are enabled
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Sound posts
    const sound = await supabase
      .from("sound_posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + LIMIT - 1);

    const plazaMapped: UnifiedFeedItem[] =
      plaza.data?.map((p: any) => ({
        square_type: "plaza",
        post: p,
        creator: p.profiles,
        trending_score:
          (p.reactions ?? 0) * 0.6 +
          (p.spirit_score ?? 0) * 0.3 +
          (p.positivity_ratio ?? 0) * 0.1,
      })) ?? [];

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

    const soundMapped: UnifiedFeedItem[] =
      sound.data?.map((p: any) => ({
        square_type: "sound-square",
        post: p,
        creator: p.profiles,
        trending_score:
          (p.reactions ?? 0) * 0.6 +
          (p.spirit_score ?? 0) * 0.3 +
          (p.positivity_ratio ?? 0) * 0.1,
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

  // Required callbacks
  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.post.id !== id));
  }

  function handleReact() {
    // Add real-time reaction updates later
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
            return (
              <VisionCard
                key={item.post.id}
                post={item.post}
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
