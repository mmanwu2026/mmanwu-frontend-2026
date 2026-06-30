"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import VisionCard from "@/app/vision-square/components/VisionCard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface ReactionRow {
  maskTier: number;
}

export default function SearchComponent() {
  const supabase = useSupabase();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
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

    let data, error;

    if (isHashtag) {
      ({ data, error } = await supabase
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
        .contains("tags", [cleaned])
        .order("created_at", { ascending: false }));
    } else {
      ({ data, error } = await supabase
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

    // ⭐ Normalize creator + comment profiles
    const normalized = (data || []).map((post: any) => {
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

return {
  ...post,
  tags: Array.isArray(post.tags) ? post.tags : [],   // ⭐ FIX
  users: {
    username: creator?.username ?? "unknown",
    avatar_url: creator?.avatar_url ?? null,
  },
  comments,
  comment_count: comments.length,
};
    });

    // ⭐ Recalculate reactions + positivity + automask
    const enriched = [];

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
    <div className="max-w-2xl mx-auto p-6 text-white">

      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Search VisionSquare</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search title, creator, or #hashtag…"
          className="flex-1 p-2 rounded bg-gray-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={() => handleSearch()}
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-400">Searching…</p>}

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
