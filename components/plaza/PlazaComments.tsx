
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

function getAvatar(url: string | null | undefined) {
  if (!url || url.trim() === "") return FALLBACK_AVATAR;
  return url;
}

interface PlazaComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function PlazaComments({
  postId,
  postCreatorId,
  creatorContent,
  creatorAvatar,
  creatorUsername,
  creatorCreatedAt
}: {
  postId: string;
  postCreatorId: string;
  creatorContent: string;
  creatorAvatar: string | null;
  creatorUsername: string | null;
  creatorCreatedAt: string;
}) {
  const supabase = useSupabase();
  const [comments, setComments] = useState<PlazaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [rewriteMode, setRewriteMode] = useState(false);
  const [rewriteMessage, setRewriteMessage] = useState("");
  const [toast, setToast] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // -----------------------------
  // LOAD COMMENTS
  // -----------------------------
  async function loadComments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("plaza_post_comments")
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const mapped = data.map((c: any) => ({
        ...c,
        profile: c.profiles
      }));
      setComments(mapped);
    }

    setLoading(false);
  }

  // -----------------------------
  // SUBMIT COMMENT (SERVER AI GATEKEEPER)
  // -----------------------------
  async function submitComment() {
    if (!text.trim()) return;

    const user = await supabase.auth.getUser();
    const uid = user.data.user?.id;
    if (!uid) return;

    const response = await fetch("/api/plaza/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        content: text.trim(),
        userId: uid
      }),
    });

    const result = await response.json();

    if (!result.approved) {
      setRewriteMode(true);
      setRewriteMessage(result.toast);
      return;
    }

    setText("");
    setRewriteMode(false);
    setToast(result.toast);
    loadComments();
  }

  // -----------------------------
  // DELETE COMMENT (Gatekeeper or Author)
  // -----------------------------
  async function deleteComment(id: string) {
    await supabase
      .from("plaza_post_comments")
      .delete()
      .eq("id", id);

    loadComments();
  }

  // -----------------------------
  // INIT
  // -----------------------------
  useEffect(() => {
    supabase.auth.getUser().then((u: any) => {
      setUserId(u.data.user?.id || null);
    });

    loadComments();

    const channel = supabase
      .channel(`plaza-comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plaza_post_comments", filter: `post_id=eq.${postId}` },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const isGatekeeper = userId === postCreatorId;

  return (
    <div className="mt-6 w-full px-2">

      {/* CREATOR'S INITIAL POST */}
      <div className="mb-6 p-3 bg-neutral-900 rounded border border-neutral-700">
        <div className="flex items-start gap-3">
          <img
            src={getAvatar(creatorAvatar)}
            className="w-8 h-8 rounded-full border border-gray-700"
          />
          <div className="flex-1">
            <p className="text-sm text-purple-200 font-semibold">
              {creatorUsername || "unknown"}
            </p>
            <p className="text-sm text-gray-200 whitespace-pre-line">
              {creatorContent}
            </p>
            <p className="text-[10px] text-gray-500">
              {new Date(creatorCreatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* COMMENTS HEADER */}
      <h3 className="text-sm text-gray-300 mb-2">Comments</h3>

      {loading && <p className="text-gray-500 text-xs">Loading…</p>}

      {/* COMMENT LIST */}
      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
        {comments.map((c) => {
          const isAuthor = c.user_id === userId;

          return (
            <div key={c.id} className="flex items-start gap-2">
              <img
                src={getAvatar(c.profile?.avatar_url)}
                className="w-7 h-7 rounded-full border border-gray-700"
              />
              <div className="flex-1">
                <p className="text-xs text-purple-200 font-semibold">
                  {c.profile?.username || "unknown"}
                </p>
                <p className="text-sm text-gray-200 whitespace-pre-line">
                  {c.content}
                </p>
                <p className="text-[10px] text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>

              {(isAuthor || isGatekeeper) && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 ml-2"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* REWRITE MODE */}
      {rewriteMode && (
        <div className="mt-4 p-3 bg-neutral-800 rounded border border-red-500">
          <p className="text-red-300 text-sm mb-2">{rewriteMessage}</p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Rewrite your comment…"
            className="flex-1 bg-neutral-900 text-gray-200 text-sm px-3 py-2 rounded w-full"
          />
          <button
            onClick={submitComment}
            className="mt-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-500"
          >
            Submit Rewrite
          </button>
        </div>
      )}

      {/* NORMAL COMPOSER */}
      {!rewriteMode && (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 bg-neutral-800 text-gray-200 text-sm px-3 py-2 rounded"
          />
          <button
            onClick={submitComment}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-500"
          >
            Post
          </button>
        </div>
      )}

      {/* SPIRIT TOAST */}
      {toast && (
        <p className="mt-2 text-xs text-green-400">{toast}</p>
      )}
    </div>
  );
}
