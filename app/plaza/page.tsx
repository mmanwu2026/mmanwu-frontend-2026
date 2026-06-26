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
  automask: number;
  mask: number;
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

  const sessionReady = hydrated && !userLoading && !!user;

  // -----------------------------------------------------
  // FETCH POSTS
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
          *,
          reactions:reactions(maskTier)
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (postsError || !postsData) {
        console.error("Error fetching posts:", postsError);
        if (!append) setPosts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const typedPosts = postsData as any[];

      const merged: PlazaPostWithAggregates[] = typedPosts.map((post: any) => {
        const counts: ReactionCounts = {
          mask1: post.reactions.filter((r: any) => r.maskTier === 1).length,
          mask2: post.reactions.filter((r: any) => r.maskTier === 2).length,
          mask3: post.reactions.filter((r: any) => r.maskTier === 3).length,
          mask4: post.reactions.filter((r: any) => r.maskTier === 4).length,
          mask5: post.reactions.filter((r: any) => r.maskTier === 5).length,
          mask6: post.reactions.filter((r: any) => r.maskTier === 6).length,
        };

        return {
          ...post,
          reactions: counts,
          spirit_score: post.spirit_score ?? 0,
          positivity_ratio: post.positivity_ratio ?? 0.5,
          automask: post.automask ?? 3,
          mask: post.mask ?? 3,
        };
      });

      setPosts((prev) => (append ? [...prev, ...merged] : merged));

      if (typedPosts.length < PAGE_SIZE) setHasMore(false);

      if (!append) setLoading(false);
      setLoadingMore(false);
    },
    [supabase, sessionReady]
  );

  // -----------------------------------------------------
  // INITIAL LOAD
  // -----------------------------------------------------
  useEffect(() => {
    if (!sessionReady) return;
    fetchPosts(0, false);
  }, [sessionReady, fetchPosts]);

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

      // PlazaCard handles fallback avatar
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
              Mmanwu Plaza
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
                  onDelete={handleDelete}
                  onReact={reloadPosts}
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
