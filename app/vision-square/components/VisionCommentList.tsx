"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

interface VisionCommentListProps {
  postId: string;
}

export default function VisionCommentList({ postId }: VisionCommentListProps) {
  const supabase = useSupabase();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      setLoading(true);

      const { data, error } = await supabase
        .from("vision_post_comments")
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setComments(data || []);
      setLoading(false);
    }

    if (postId) fetchComments();
  }, [postId, supabase]);

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading comments…</p>;
  }

  if (!comments.length) {
    return <p className="text-gray-500 text-sm">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const profile = comment.profiles;
        return (
          <div
            key={comment.id}
            className="bg-gray-900 rounded-lg p-3 flex gap-3"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username ?? "avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  {profile?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-purple-200">
                  {profile?.username ?? "Unknown"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-gray-100">{comment.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
