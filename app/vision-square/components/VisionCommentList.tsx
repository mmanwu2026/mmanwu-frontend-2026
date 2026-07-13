"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";

export default function VisionCommentList({ postId }: { postId: string }) {
  const { supabase } = useSupabase();;
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchComments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("vision_post_comments")
      .select(`
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
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((c: any) => {
      const profile =
        Array.isArray(c.profiles) && c.profiles.length > 0
          ? c.profiles[0]
          : c.profiles;

      return {
        ...c,
        profiles: {
          username: profile?.username ?? "unknown",
          avatar_url: profile?.avatar_url || null,
        },
      };
    });

    setComments(normalized);
    setLoading(false);
  }

  useEffect(() => {
    fetchComments();

    // ⭐ REALTIME SUBSCRIPTION — Feed updates instantly
    const channel = supabase
      .channel(`vision-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vision_post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments(); // ⭐ Refresh comments in Feed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, supabase]);

  if (loading) {
    return <p className="text-gray-400">Loading comments…</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => {
        const isPositive = c.automask >= 3;

        return (
          <div key={c.id} className="bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              {c.profiles.avatar_url && (
                <img
                  src={c.profiles.avatar_url}
                  className="w-8 h-8 rounded-full border border-gray-700"
                  alt="avatar"
                />
              )}

              <span className="text-purple-200 font-semibold">
                {c.profiles.username}
              </span>

              {/* ⭐ Positive Mask Badge */}
              {isPositive && (
                <span className="text-xs bg-green-700 px-2 py-1 rounded text-white">
                  ✨ Uplifting
                </span>
              )}
            </div>

            {/* ⭐ FIXED — correct field */}
            <p className="text-gray-300">{c.content}</p>

            <p className="text-gray-500 text-xs mt-2">
              {new Date(c.created_at).toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
}
