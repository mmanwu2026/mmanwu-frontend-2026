"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import TrendingHashtags from "./components/TrendingHashtags";
import VisionCard from "@/app/vision-square/components/VisionCard";

/* ---------------------------------------------------------
   Move interface OUTSIDE the component
--------------------------------------------------------- */
interface VisionIndexPost {
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
  comments: any[];
  comment_count: number;
}

export default function VisionSquareIndex() {
  const { supabase } = useSupabase();
  const [recentPosts, setRecentPosts] = useState<VisionIndexPost[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  /* --------------------------------------------- */
  /* LOAD VIEWER                                    */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  /* --------------------------------------------- */
  /* LOAD RECENT POSTS (WITH PRIVACY)               */
  /* --------------------------------------------- */
  useEffect(() => {
    async function loadRecent() {
      const { data, error } = await supabase
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
        .limit(6);

      if (error || !data) return;

      const filtered: any[] = [];

      for (const post of data) {
        const privacy = post.privacy_type ?? "public";

        if (privacy === "public") {
          filtered.push(post);
          continue;
        }

        if (!uid) continue;

        const { data: followRows } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", post.creator_id)
          .limit(1);

        if (followRows?.[0]) {
          filtered.push(post);
        }
      }

      const normalized = await Promise.all(
        filtered.map(async (post: any) => {
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
            tags: Array.isArray(post.tags) ? post.tags : [],
            users: {
              username: creator?.username ?? "unknown",
              avatar_url: creator?.avatar_url ?? null,
            },
            comments,
            comment_count: comments.length,
            is_follower: isFollower,
          };
        })
      );

      setRecentPosts(normalized);
    }

    loadRecent();
  }, [supabase, uid]);

  /* --------------------------------------------- */
  /* JSX                                            */
  /* --------------------------------------------- */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-gray-900">
      {/* Navigation */}
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

      <h1 className="text-3xl font-bold mb-2">Vision Square</h1>

      <p className="text-gray-600 mb-8">
        Explore visual stories, trending videos, and powerful moments shared by the community.
      </p>

      <TrendingHashtags />

      <h2 className="text-xl font-semibold mt-10 mb-4 text-purple-700">
        Recent Posts
      </h2>

      <div className="space-y-6">
        {recentPosts.map((post: any) => (
          <VisionCard key={post.id} post={post} />
        ))}
      </div>

      {/* Main Links */}
      <div className="space-y-4 mt-10">
        <Link
          href="/vision-square/feed"
          className="block border border-gray-200 hover:border-purple-300 p-4 rounded-lg transition bg-white"
        >
          <h2 className="text-xl font-semibold text-purple-700 mb-1">
            Vision Feed
          </h2>
          <p className="text-gray-600 text-sm">
            See the latest uploads from creators across Vision Square.
          </p>
        </Link>

        <Link
          href="/vision-square/trending"
          className="block border border-gray-200 hover:border-purple-300 p-4 rounded-lg transition bg-white"
        >
          <h2 className="text-xl font-semibold text-purple-700 mb-1">
            Trending
          </h2>
          <p className="text-gray-600 text-sm">
            Discover the most uplifting and highest‑spirit posts.
          </p>
        </Link>

        <Link
          href="/vision-square/create"
          className="block border border-gray-200 hover:border-purple-300 p-4 rounded-lg transition bg-white"
        >
          <h2 className="text-xl font-semibold text-purple-700 mb-1">
            Upload to Vision Square
          </h2>
          <p className="text-gray-600 text-sm">
            Share your images or videos with a title and let the community react.
          </p>
        </Link>
      </div>
    </div>
  );
}
