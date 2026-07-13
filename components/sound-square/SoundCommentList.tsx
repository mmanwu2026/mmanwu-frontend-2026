"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";

export default function SoundCommentList({ postId }: { postId: string }) {
  const { supabase } = useSupabase();
  const [comments, setComments] = useState<any[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  async function loadComments() {
    const res = await fetch(`/api/sound-comments?post_id=${postId}`);
    const data = await res.json();

    const normalized = (data.comments || []).map((c: any) => ({
      ...c,
      users: Array.isArray(c.users) ? c.users[0] : c.users,
    }));

    setComments(normalized);

    if (data.creator_id) {
      setCreatorId(data.creator_id);
    }
  }

  useEffect(() => {
    loadComments();

    // ⭐ FIXED — correct table name
    const channel = supabase
      .channel(`sound-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sound_post_comments",   // ⭐ FIXED
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments(); // refresh on new comment
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, supabase]);

  if (comments.length === 0) {
    return <p className="text-white/40 mt-6">No comments yet…</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      {comments.map((c) => (
        <div
          key={c.id}
          className="
            border border-white/10 p-4 rounded 
            bg-neutral-900/40 
            animate-[fadeIn_0.4s_ease-out_forwards] opacity-0
          "
        >
          <div className="flex items-center gap-3">
            {c.users?.avatar_url ? (
              <img
                src={c.users.avatar_url}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-700 border border-white/10" />
            )}

            <div className="flex flex-col">
              <Link
                href={`/profile/${c.user_id}`}
                className="text-purple-300 hover:text-purple-400 underline"
              >
                @{c.users?.username ?? "Unknown"}
              </Link>

              {creatorId && c.user_id === creatorId && (
                <span className="text-xs text-purple-400">Creator</span>
              )}
            </div>
          </div>

<p className="mt-3 text-white leading-relaxed">{c.content}</p>

          <p className="text-xs text-white/40 mt-2">
            {new Date(c.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
