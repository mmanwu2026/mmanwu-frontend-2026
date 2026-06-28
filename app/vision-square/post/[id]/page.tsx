"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";
import VisionComments from "@/app/vision-square/components/VisionComments";
import VisionCommentList from "@/app/vision-square/components/VisionCommentList";

export default function VisionPostPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      const { data, error } = await supabase
        .from("vision_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPost(data);
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
      {/* Top navigation */}
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

      {/* ⭐ TITLE HEADER */}
      {post.title && (
        <h1 className="text-3xl font-bold mb-6 text-purple-200">
          {post.title}
        </h1>
      )}

      {/* Main post card */}
      <VisionCard post={post} />

      {/* Comments section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Comments</h2>

        {/* Comment input with Gatekeeper */}
        <VisionComments postId={post.id} />

        {/* Comment list */}
        <div className="mt-6">
          <VisionCommentList postId={post.id} />
        </div>
      </div>
    </div>
  );
}
