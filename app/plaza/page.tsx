"use client";

import React, { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import PostCard from "@/components/plaza/PostCard";
import FloatingComposer from "@/components/FloatingComposer";

type PlazaPost = {
  id: number;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number;
};

type ReactionAggregates = {
  post_id: number;
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  total_reactions: number;
  positivity_ratio: number;
};

type PlazaPostWithAggregates = PlazaPost & {
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
  positivityRatio: number;
  totalReactions: number;
};

export default function PlazaPage() {
  const supabase = createSupabaseBrowserClient();

  const [posts, setPosts] = useState<PlazaPostWithAggregates[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPlaza = async () => {
    setLoading(true);

    // 1️⃣ Fetch posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError || !postsData) {
      console.error("Posts fetch error:", postsError);
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch aggregated reactions from MATERIALIZED VIEW
    const { data: aggData, error: aggError } = await supabase
      .from("reaction_aggregates_mv")
      .select("*");

    if (aggError || !aggData) {
      console.error("Aggregates fetch error:", aggError);
      setLoading(false);
      return;
    }

    // 3️⃣ Merge posts + aggregates
    const merged: PlazaPostWithAggregates[] = postsData.map((post) => {
      const agg = aggData.find((a) => a.post_id === post.id);

      return {
        ...post,
        reactions: {
          mask1: agg?.mask1 ?? 0,
          mask2: agg?.mask2 ?? 0,
          mask3: agg?.mask3 ?? 0,
          mask4: agg?.mask4 ?? 0,
          mask5: agg?.mask5 ?? 0,
        },
        positivityRatio: agg?.positivity_ratio ?? 0.5,
        totalReactions: agg?.total_reactions ?? 0,
      };
    });

    setPosts(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaza();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Loading Plaza…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 pb-40">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          reactions={post.reactions}
          positivityRatio={post.positivityRatio}
          onReact={fetchPlaza}
        />
      ))}

      <FloatingComposer onPost={fetchPlaza} />
    </div>
  );
}
