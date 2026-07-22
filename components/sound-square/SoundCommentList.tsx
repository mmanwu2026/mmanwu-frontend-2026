"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";

export default function SoundCommentList({ postId }: { postId: string }) {
  const { supabase } = useSupabase();

  const [comments, setComments] = useState<any[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

  const [uid, setUid] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  // Load authenticated user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  // Load creator + privacy_type
  useEffect(() => {
    async function loadMeta() {
      const { data: rows } = await supabase
        .from("sound_posts")
        .select("creator_id, privacy_type")
        .eq("id", postId)
        .limit(1);

      const row = rows?.[0] ?? null;

      if (row?.creator_id) setCreatorId(row.creator_id);
      if (row?.privacy_type) setPrivacyType(row.privacy_type);
    }

    loadMeta();
  }, [postId, supabase]);

  // Load follow-state
  useEffect(() => {
    async function loadFollowState() {
      if (!uid || !creatorId) return;

      const { data: rows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", creatorId)
        .limit(1);

      setIsFollowing(!!rows?.[0]);
    }

    loadFollowState();
  }, [uid, creatorId, supabase]);

  // Privacy enforcement
  const isCreator = uid === creatorId;
  const isAllowed =
    privacyType === "public" ||
    isCreator ||
    isFollowing === true;

  // Load comments
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

    const channel = supabase
      .channel(`sound-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sound_post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, supabase]);

  // Block comment list entirely
  if (!isAllowed) {
    return (
      <p className="text-white/40 mt-6">
        Comments are private for this sound.
      </p>
    );
  }

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
