"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import { useSupabase } from "@/context/SupabaseContext";
import Sidebar from "@/components/plaza/Sidebar";
import FloatingComposer from "@/components/plaza/FloatingComposer";
import { useUser } from "@/context/UserContext";
import PlazaCard from "@/components/plaza/PlazaCard";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface PlazaPostWithAggregates {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  autoMask: number;
  reactions: ReactionCounts;
}

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const PAGE_SIZE = 20;

export default function PlazaPage() {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [hydrated, setHydrated] = useState(false);
  const [posts, setPosts] = useState<PlazaPostWithAggregates[]>([]);
  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reloadGuardRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  const sessionReady = hydrated && !userLoading;

  // -----------------------------------------------------
  // FETCH POSTS (reactions batched per page)
  // -----------------------------------------------------
  const fetchPosts = useCallback(
    async (pageToLoad: number = 0, append = false) => {
      if (!sessionReady) return;

      if (!append) setLoading(true);

      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          creator_id,
          content,
          created_at,
          spirit_score,
          positivity_ratio,
          automask
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (postsError || !postsData) {
        console.error("Error fetching posts:", postsError);
        if (!append) setPosts([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const typedPosts = postsData as any[];

      // If no posts, stop here
      if (typedPosts.length === 0) {
        setPosts((prev) => (append ? prev : []));
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const postIds = typedPosts.map((p) => p.id);

      // Fetch all reactions for these posts in one query
      const { data: reactionRows, error: reactionError } = await supabase
        .from("reactions")
        .select("post_id, maskTier")
        .in("post_id", postIds)
        .eq("post_type", "plaza");

      if (reactionError) {
        console.error("Error fetching reactions:", reactionError);
      }

      // Build reaction map
      const reactionMap: Record<
        string,
        {
          mask1: number;
          mask2: number;
          mask3: number;
          mask4: number;
          mask5: number;
          mask6: number;
          spirit: number;
          positivity: number;
          autoMask: number;
        }
      > = {};

      for (const postId of postIds) {
        reactionMap[postId] = {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
          spirit: 0,
          positivity: 0.5,
          autoMask: 2,
        };
      }

      const rows = reactionRows ?? [];

      for (const r of rows) {
        const entry = reactionMap[r.post_id];
        if (!entry) continue;

        const tier = r.maskTier;

        if (tier === 1) entry.mask1++;
        if (tier === 2) entry.mask2++;
        if (tier === 3) entry.mask3++;
        if (tier === 4) entry.mask4++;
        if (tier === 5) entry.mask5++;
        if (tier === 6) entry.mask6++;

        entry.spirit += tier;
      }

      // Compute positivity + autoMask
      for (const postId of postIds) {
        const entry = reactionMap[postId];

        const totalCount =
          entry.mask1 +
          entry.mask2 +
          entry.mask3 +
          entry.mask4 +
          entry.mask5 +
          entry.mask6;

        const positiveCount =
          entry.mask3 + entry.mask4 + entry.mask5 + entry.mask6;

        entry.positivity =
          totalCount > 0 ? positiveCount / totalCount : 0.5;

        let autoMask = 2;
        if (entry.spirit > 20) autoMask = 3;
        if (entry.spirit > 100) autoMask = 4;
        if (entry.spirit > 300) autoMask = 5;
        if (entry.spirit > 500) autoMask = 6;

        entry.autoMask = autoMask;
      }

      // Merge posts with aggregates
      const merged: PlazaPostWithAggregates[] = [];

      for (const post of typedPosts) {
        const entry = reactionMap[post.id];

        merged.push({
          id: post.id,
          creator_id: post.creator_id,
          content: post.content,
          created_at: post.created_at,
          spirit_score: entry?.spirit ?? 0,
          positivity_ratio: entry?.positivity ?? 0.5,
          autoMask: entry?.autoMask ?? 2,
          reactions: {
            mask1: entry?.mask1 ?? 0,
            mask2: entry?.mask2 ?? 0,
            mask3: entry?.mask3 ?? 0,
            mask4: entry?.mask4 ?? 0,
            mask5: entry?.mask5 ?? 0,
            mask6: entry?.mask6 ?? 0,
          },
        });
      }

      setPosts((prev) => (append ? [...prev, ...merged] : merged));

      if (typedPosts.length < PAGE_SIZE) setHasMore(false);

      if (!append) setLoading(false);
      setLoadingMore(false);
    },
    [supabase, sessionReady]
  );

  // INITIAL LOAD — do not refetch if posts already exist
  useEffect(() => {
    if (!sessionReady) return;

    if (posts.length > 0) return;

    fetchPosts(0, false);
  }, [sessionReady, fetchPosts, posts.length]);

  const reloadPosts = useCallback(() => {
    if (!sessionReady) return;
    fetchPosts(0, false);
  }, [sessionReady, fetchPosts]);

  // -----------------------------------------------------
  // REALTIME SUBSCRIPTIONS
  // -----------------------------------------------------
  useEffect(() => {
    if (!sessionReady) return;

    const channel = supabase
      .channel("plaza-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => {
          if (!reloadGuardRef.current) {
            reloadGuardRef.current = true;
            fetchPosts(0, false).finally(() => {
              setTimeout(() => {
                reloadGuardRef.current = false;
              }, 500);
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          if (!reloadGuardRef.current) {
            reloadGuardRef.current = true;
            fetchPosts(0, false).finally(() => {
              setTimeout(() => {
                reloadGuardRef.current = false;
              }, 500);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionReady, supabase, fetchPosts]);

  // -----------------------------------------------------
  // FETCH CREATOR PROFILES
  // -----------------------------------------------------
  async function fetchCreator(id: string) {
    if (!sessionReady) return null;

    if (creators[id]) return creators[id];

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", id)
      .single();

    if (!error && data) {
      const profile = data as CreatorProfile;
      setCreators((prev) => ({ ...prev, [id]: profile }));
      return profile;
    }

    return null;
  }

  useEffect(() => {
    if (!sessionReady) return;

    const missingCreatorIds = posts
      .map((p) => p.creator_id)
      .filter((id) => !creators[id]);

    if (missingCreatorIds.length === 0) return;

    (async () => {
      for (const id of missingCreatorIds) {
        await fetchCreator(id);
      }
    })();
  }, [sessionReady, posts, creators]);

  // -----------------------------------------------------
  // DELETE POST
  // -----------------------------------------------------
  async function handleDelete(postId: string) {
    if (!sessionReady) return;

    setDeletingId(postId);

    await supabase.from("posts").delete().eq("id", postId);

    setDeletingId(null);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  // -----------------------------------------------------
  // LOAD MORE
  // -----------------------------------------------------
  async function handleLoadMore() {
    if (!sessionReady) return;
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);

    const nextPage = page + 1;
    await fetchPosts(nextPage, true);
    setPage(nextPage);
  }

  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------
  if (!hydrated || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading Plaza…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Please log in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-gray-100">
      <Sidebar />

      <div className="fixed left-0 top-20 w-[120px] px-4 z-[5000] pointer-events-none">
        <div className="pointer-events-auto">
          <FloatingComposer onPost={reloadPosts} />
        </div>
      </div>

      <div className="flex">
        <div className="w-[120px] shrink-0 bg-black pointer-events-none" />

        <div className="flex-1 flex flex-col items-center pt-36 pb-40 px-4">
          <div className="w-full flex flex-col items-center mb-10">
            <h1 className="text-3xl font-bold text-purple-200 tracking-wide clean-plaza-header">
              Mman Plaza
            </h1>
          </div>

          {loading && <p className="text-gray-300">Loading posts…</p>}

          {!loading && posts.length === 0 && (
            <p className="text-gray-300">No posts yet…</p>
          )}

          <div className="space-y-12 w-full flex flex-col items-center">
            {posts.map((post) => {
              const creator = creators[post.creator_id];

              if (!creator) {
                return (
                  <div
                    key={post.id}
                    className="text-gray-500 text-xs italic"
                  >
                    Loading identity…
                  </div>
                );
              }

              return (
                <PlazaCard
  key={post.id}
  post={post}
  creator={creator}
  user={user}
  onDeleteAction={handleDelete}
  onReactAction={reloadPosts}
/>
              );
            })}
          </div>

          {!loading && hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-8 bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 disabled:opacity-50 text-sm"
            >
              {loadingMore ? "Loading more…" : "Load more"}
            </button>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="mt-4 text-gray-500 text-xs">
              You’ve reached the end of the Plaza.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
