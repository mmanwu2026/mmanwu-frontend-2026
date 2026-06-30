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
  parent_comment_id: string | null;
  profile: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface PlazaCommentNode extends PlazaComment {
  replies: PlazaCommentNode[];
}

export default function PlazaComments({
  postId,
  postCreatorId
}: {
  postId: string;
  postCreatorId: string;
}) {
  const supabase = useSupabase();
  const [comments, setComments] = useState<PlazaComment[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [rewriteMode, setRewriteMode] = useState(false);
  const [rewriteMessage, setRewriteMessage] = useState("");
  const [toast, setToast] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  // Threaded reply state
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

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
        parent_comment_id,
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
  // SUBMIT TOP-LEVEL COMMENT
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
        userId: uid,
        parentCommentId: null
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
  // SUBMIT REPLY
  // -----------------------------
  async function submitReply(parentId: string) {
    if (!replyText.trim()) return;

    const user = await supabase.auth.getUser();
    const uid = user.data.user?.id;
    if (!uid) return;

    const response = await fetch("/api/plaza/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        content: replyText.trim(),
        userId: uid,
        parentCommentId: parentId
      }),
    });

    const result = await response.json();

    if (!result.approved) {
      setRewriteMode(true);
      setRewriteMessage(result.toast);
      return;
    }

    setReplyText("");
    setReplyTargetId(null);
    setRewriteMode(false);
    setToast(result.toast);
    loadComments();
  }

  // -----------------------------
  // DELETE COMMENT
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

  // -----------------------------
  // BUILD COMMENT TREE (TS SAFE)
  // -----------------------------
  function buildCommentTree(flat: PlazaComment[]): PlazaCommentNode[] {
    const lookup: Record<string, PlazaCommentNode> = {};
    const roots: PlazaCommentNode[] = [];

    flat.forEach((c) => {
      lookup[c.id] = { ...c, replies: [] };
    });

    flat.forEach((c) => {
      const node = lookup[c.id];
      if (c.parent_comment_id) {
        const parent = lookup[c.parent_comment_id];
        if (parent) {
          parent.replies.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // -----------------------------
  // RECURSIVE COMMENT NODE
  // -----------------------------
  function CommentNode({
    node,
    depth
  }: {
    node: PlazaCommentNode;
    depth: number;
  }) {
    const isAuthor = node.user_id === userId;

    return (
      <div className="mb-2" style={{ marginLeft: depth * 16 }}>
        <div className="flex items-start gap-2">
          <img
            src={getAvatar(node.profile?.avatar_url)}
            className="rounded-full border border-gray-700"
            style={{
              width: "28px",
              height: "28px",
              minWidth: "28px",
              minHeight: "28px",
              objectFit: "cover"
            }}
          />

          <div className="flex-1">
            <p className="text-xs text-purple-200 font-semibold">
              {node.profile?.username || "unknown"}
            </p>
            <p className="text-sm text-gray-200 whitespace-pre-line">
              {node.content}
            </p>
            <p className="text-[10px] text-gray-500">
              {new Date(node.created_at).toLocaleString()}
            </p>

            <div className="flex items-center gap-2 mt-1">
              {(isAuthor || isGatekeeper) && (
                <button
                  onClick={() => deleteComment(node.id)}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              )}

              <button
                onClick={() =>
                  setReplyTargetId(replyTargetId === node.id ? null : node.id)
                }
                className="text-[10px] text-purple-300 hover:text-purple-200"
              >
                Reply
              </button>
            </div>

            {replyTargetId === node.id && (
              <div className="mt-2 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  className="flex-1 bg-neutral-800 text-gray-200 text-sm px-3 py-2 rounded"
                />
                <button
                  onClick={() => submitReply(node.id)}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-500"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>

        {node.replies.map((child) => (
          <CommentNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="mt-6 w-full px-2">

      {/* COMMENTS HEADER */}
      <h3 className="text-sm text-gray-300 mb-2">Comments</h3>

      {loading && <p className="text-gray-500 text-xs">Loading…</p>}

      {/* COMMENT TREE */}
      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
        {buildCommentTree(comments).map((node) => (
          <CommentNode key={node.id} node={node} depth={0} />
        ))}
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
