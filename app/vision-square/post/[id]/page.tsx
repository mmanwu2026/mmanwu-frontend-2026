"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";
import VisionComments from "@/app/vision-square/components/VisionComments";
import VisionCommentList from "@/app/vision-square/components/VisionCommentList";
import VisionShareButton from "@/components/vision-square/VisionShareButton";
import SpiritToast from "@/components/SpiritToast";

interface ReactionRow {
  post_id: string;
  maskTier: number;
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
}

export default function VisionPostPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<VisionPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

      const finalPost: VisionPost = {
        ...data,
        users: {
          username: normalizedUser?.username ?? "unknown",
          avatar_url: normalizedUser?.avatar_url ?? null,
        },
        reactions: counts,
      };

      // ⭐ SpiritToast for positive posts
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

      {/* ⭐ SpiritToast */}
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

        {user && (
          <Link
            href={`/profile/${user.id}`}
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

      {/* ⭐ Vision Card */}
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

      {/* ⭐ Comments Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Comments</h2>

        <VisionComments postId={post.id} />

        <div className="mt-6">
          <VisionCommentList postId={post.id} />
        </div>
      </div>
    </div>
  );
}
