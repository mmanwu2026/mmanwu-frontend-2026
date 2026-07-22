"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import VisionCard from "@/app/vision-square/components/VisionCard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface ReactionRow {
  maskTier: number;
}

interface EnrichedPost {
  id: string;
  title: string;
  media_url: string;
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
  comments: any[];
  comment_count: number;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
  total_reactions: number;
}

export default function SearchComponent() {
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const tagParam = searchParams?.get("tag") ?? null;

  useEffect(() => {
    if (tagParam) {
      const tagQuery = `#${tagParam}`;
      setQuery(tagQuery);
      handleSearch(tagQuery);
    }
  }, [tagParam]);

  async function handleSearch(forcedQuery?: string) {
    const q = forcedQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);

    const cleaned = q.replace("#", "").toLowerCase();
    const isHashtag = q.startsWith("#");

    const session = await supabase.auth.getSession();
    const viewerId = session.data.session?.user?.id ?? null;

    let data: any[] | null = null;
    let error: any = null;

    /* --------------------------------------------- */
    /* RAW SEARCH (NO PRIVACY YET)                    */
    /* --------------------------------------------- */
    const baseSelect = `
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
    `;

    if (isHashtag) {
      ({ data, error } = await supabase
        .from("vision_posts")
        .select(baseSelect)
        .contains("tags", [cleaned])
        .order("created_at", { ascending: false }));
    } else {
      ({ data, error } = await supabase
        .from("vision_posts")
        .select(baseSelect)
        .or(
          `title.ilike.%${cleaned}%, users.username.ilike.%${cleaned}%, tags.cs.{${cleaned}}`
        )
        .order("created_at", { ascending: false }));
    }

    if (error) {
      console.error("Search error:", error);
      setLoading(false);
      return;
    }

    /* --------------------------------------------- */
    /* PRIVACY FILTER                                 */
    /* --------------------------------------------- */
    const privacyFiltered: any[] = [];

    for (const post of data ?? []) {
      const privacy = post.privacy_type ?? "public";

      if (privacy === "public") {
        privacyFiltered.push(post);
        continue;
      }

      if (!viewerId) continue;

      const { data: followRows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", viewerId)
        .eq("following_id", post.creator_id)
        .limit(1);

      if (followRows?.[0]) {
        privacyFiltered.push(post);
      }
    }

    /* --------------------------------------------- */
    /* NORMALIZE POSTS                                */
    /* --------------------------------------------- */
    const normalized: EnrichedPost[] = await Promise.all(
      privacyFiltered.map(async (post: any) => {
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
                avatar_url: profile?.avatar_url ?? null,
              },
            };
          }) ?? [];

        /* FOLLOW STATE */
        let isFollower = false;

        if (viewerId && post.creator_id !== viewerId) {
          const { data: followRows } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", viewerId)
            .eq("following_id", post.creator_id)
            .limit(1);

          isFollower = !!followRows?.[0];
        }

        return {
          ...post,
          tags: Array.isArray(post.tags) ? post.tags : [],
          users: {
            username: creator?.username ?? "unknown",
            avatar_url: creator?.avatar_url ?? null,
          },
          comments,
          comment_count: comments.length,
          reactions: {
            mask1: 0,
            mask2: 0,
            mask3: 0,
            mask4: 0,
            mask5: 0,
            mask6: 0,
          },
          total_reactions: 0,
          is_follower: isFollower,
        };
      })
    );

    /* --------------------------------------------- */
    /* ENRICH REACTIONS                               */
    /* --------------------------------------------- */
    const enriched: EnrichedPost[] = [];

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

    setResults(enriched);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-gray-900">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/plaza"
          className="text-gray-600 hover:text-purple-600 transition"
        >
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 text-white"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Search VisionSquare</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search title, creator, or #hashtag…"
          className="flex-1 p-2 rounded bg-gray-100 border border-gray-300"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={() => handleSearch()}
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 text-white"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-500">Searching…</p>}

      {searched && !loading && results.length === 0 && (
        <p className="text-gray-500">No results found.</p>
      )}

      {results.map((post) => (
        <VisionCard
          key={`${post.id}-${post.total_reactions}-${post.comment_count}`}
          post={post}
        />
      ))}
    </div>
  );
}
