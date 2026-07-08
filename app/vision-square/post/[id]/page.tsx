"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useParams } from "next/navigation";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";
import SpiritToast from "@/components/SpiritToast";
import VisionShareButton from "@/components/vision-square/VisionShareButton";

interface ReactionRow {
  post_id: string;
  maskTier: number;
}

interface VisionComment {
  id: string;
  content: string;
  raw_input: string | null;
  created_at: string;
  automask: number;
  positivity_ratio: number;
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
  comments: VisionComment[];
  comment_count: number;
}

export default function VisionPostPage() {
  const { supabase } = useSupabase();
  const params = useParams();
  const id = params?.id as string;

  // ⭐ FIXED — authenticated user
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  const [post, setPost] = useState<VisionPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const FALLBACK_AVATAR =
    "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);

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
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      const normalizedUser =
        Array.isArray(data.users) ? data.users[0] : data.users;

      const normalizedComments =
        data.comments?.map((c: any) => {
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

      const { data: reactionRows } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .eq("post_id", id)
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

      const spirit = rows.reduce((sum, r) => sum + r.maskTier, 0);
      const positiveCount = rows.filter((r) => r.maskTier >= 3).length;
      const totalCount = rows.length;

      const positivity = totalCount > 0 ? positiveCount / totalCount : 0.5;

      let autoMask = 2;
      if (spirit > 20) autoMask = 3;
      if (spirit > 100) autoMask = 4;
      if (spirit > 300) autoMask = 5;
      if (spirit > 500) autoMask = 6;

      const finalPost: VisionPost = {
        ...data,
        users: {
          username: normalizedUser?.username ?? "unknown",
          avatar_url: normalizedUser?.avatar_url || FALLBACK_AVATAR,
        },
        reactions: counts,
        comments: normalizedComments,
        comment_count: normalizedComments.length,
        spirit_score: spirit,
        positivity_ratio: positivity,
        automask: autoMask,
      };

      if (finalPost.positivity_ratio >= 0.6) {
        setToastMessage("The spirits approve this vision ✨");
      }

      setPost(finalPost);
      setLoading(false);
    }

    if (id) fetchPost();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-white">
        <p className="text-gray-400">Loading Vision post…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-white">
        <p className="text-red-400">Vision post not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/vision-square/feed"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Back to Vision feed
        </Link>

        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          Plaza →
        </Link>

        {uid && (
          <Link
            href={`/profile/${uid}`}
            className="text-gray-300 hover:text-purple-300 transition"
          >
            Profile →
          </Link>
        )}
      </div>

      {post.title && (
        <h1 className="text-3xl font-bold mb-6 text-purple-200">
          {post.title}
        </h1>
      )}

      {/* ⭐ VisionCard handles ALL comments */}
      <VisionCard post={post} />

      {/* ⭐ Share Button */}
      <div className="mt-6">
        <VisionShareButton
          postId={post.id}
          title={post.title}
          imageUrl={post.media_url ?? ""}
          creatorUsername={post.users.username}
        />
      </div>
    </div>
  );
}
