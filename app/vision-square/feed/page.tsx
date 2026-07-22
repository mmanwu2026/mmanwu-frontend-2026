"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";

interface ReactionRow {
  maskTier: number;
}

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
  privacy_type: "public" | "private";
  is_follower: boolean;
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

export default function VisionSquareFeed() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [posts, setPosts] = useState<VisionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const PAGE_SIZE = 10;

  const FALLBACK_AVATAR =
    "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

  /* --------------------------------------------- */
  /* LOAD AUTH USER                                */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  /* --------------------------------------------- */
  /* FETCH POSTS (WITH PRIVACY + FOLLOW STATE)      */
  /* --------------------------------------------- */
  async function fetchPosts(initial = false) {
    if (initial) setLoading(true);
    else setFetchingMore(true);

    const lastCreatedAt =
      posts.length > 0 ? posts[posts.length - 1].created_at : null;

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
        privacy_type,

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
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (lastCreatedAt) {
      query = query.lt("created_at", lastCreatedAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      setFetchingMore(false);
      return;
    }

    if (data.length < PAGE_SIZE) setEndReached(true);

    /* --------------------------------------------- */
    /* NORMALIZE POSTS                                */
    /* --------------------------------------------- */
    const normalized = await Promise.all(
      data.map(async (post: any) => {
        const creator =
          Array.isArray(post.users) && post.users.length > 0
            ? post.users[0]
            : post.users;

        const comments =
          post.comments?.map((c: any) => {
            const profile =
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
                username: profile?.username ?? "unknown",
                avatar_url: profile?.avatar_url || FALLBACK_AVATAR,
              },
            };
          }) ?? [];

        /* --------------------------------------------- */
        /* FOLLOW STATE                                   */
        /* --------------------------------------------- */
        let isFollower = false;

        if (uid && post.creator_id !== uid) {
          const { data: followRows } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", uid)
            .eq("following_id", post.creator_id)
            .limit(1);

          isFollower = !!followRows?.[0];
        }

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
          is_follower: isFollower,
        };
      })
    );

    /* --------------------------------------------- */
    /* ENRICH WITH REACTIONS                          */
    /* --------------------------------------------- */
    const enriched: VisionPost[] = [];

    for (const post of normalized) {
      const { data: reactionRows } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .eq("post_id", post.id)
        .eq("post_type", "vision");

      const rows: ReactionRow[] = reactionRows ?? [];

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
    /* MERGE POSTS                                    */
    /* --------------------------------------------- */
    setPosts((prev) => {
      const map = new Map<string, VisionPost>();
      for (const p of [...prev, ...enriched]) map.set(p.id, p);
      return Array.from(map.values());
    });

    setLoading(false);
    setFetchingMore(false);
  }

  /* --------------------------------------------- */
  /* INITIAL LOAD                                   */
  /* --------------------------------------------- */
  useEffect(() => {
    fetchPosts(true);
  }, [uid]);

  /* --------------------------------------------- */
  /* INFINITE SCROLL                                */
  /* --------------------------------------------- */
  useEffect(() => {
    function onScroll() {
      if (endReached || fetchingMore) return;

      const scrollPos =
        window.innerHeight + document.documentElement.scrollTop;
      const bottom = document.documentElement.offsetHeight - 300;

      if (scrollPos >= bottom) fetchPosts(false);
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [posts, fetchingMore, endReached]);

  /* --------------------------------------------- */
  /* JSX                                            */
  /* --------------------------------------------- */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-gray-900">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/plaza" className="text-gray-600 hover:text-purple-600 transition">
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 text-white"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Vision Square</h1>

      {loading && <p className="text-gray-500">Loading Vision posts…</p>}

      {posts.map((post) => (
        <VisionCard
          key={post.id}
          post={{
            ...post,
            onDeleted: (id: string) => {
              setPosts((prev) => prev.filter((p) => p.id !== id));
            },
          }}
        />
      ))}

      {fetchingMore && (
        <p className="text-gray-500 text-center mt-4">Loading more…</p>
      )}

      {endReached && (
        <p className="text-gray-500 text-center mt-6">
          You’ve reached the end of Vision Square.
        </p>
      )}
    </div>
  );
}
