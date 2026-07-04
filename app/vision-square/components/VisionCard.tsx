// force rebuild 1
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import ReactionBar from "@/components/vision-square/ReactionBar";
import SpiritToast from "@/components/SpiritToast";
import { useRouter } from "next/navigation";
import VisionShareButton from "@/components/vision-square/VisionShareButton";

interface ReactionRow {
  maskTier: number;
}

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function VisionCard({
  post,
  smallAvatar,
}: {
  post: any;
  smallAvatar?: boolean;
}) {
  const mainAvatarSize = smallAvatar ? "w-[24px] h-[24px]" : "w-[40px] h-[40px]";
  const commentAvatarSize = smallAvatar ? "w-[20px] h-[20px]" : "w-[24px] h-[24px]";

  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const safeReactions = post.reactions ?? {
    mask1: 0,
    mask2: 0,
    mask3: 0,
    mask4: 0,
    mask5: 0,
    mask6: 0,
  };

  const [showAllComments, setShowAllComments] = useState(false);

  const safeAvatar = post.users?.avatar_url || FALLBACK_AVATAR;
  const safeMedia = typeof post.media_url === "string" ? post.media_url : null;

  const [localMask, setLocalMask] = useState(post.automask ?? 2);
  const [localSpirit, setLocalSpirit] = useState(post.spirit_score ?? 0);
  const [localPositivity, setLocalPositivity] = useState(
    post.positivity_ratio ?? 0.5
  );
  const [localReactions, setLocalReactions] = useState(safeReactions);
  const [localTotalReactions, setLocalTotalReactions] = useState(
    post.total_reactions ?? 0
  );

  useEffect(() => {
    setLocalMask(post.automask ?? 2);
    setLocalSpirit(post.spirit_score ?? 0);
    setLocalPositivity(post.positivity_ratio ?? 0.5);
    setLocalReactions(safeReactions);
    setLocalTotalReactions(post.total_reactions ?? 0);
  }, [post]);

  const [muted, setMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isVideo =
    safeMedia &&
    (safeMedia.endsWith(".mp4") ||
      safeMedia.endsWith(".webm") ||
      safeMedia.endsWith(".mov"));

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) videoRef.current?.play();
          else videoRef.current?.pause();
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [isVideo]);

  async function refreshReactions() {
    const { data: reactionRows } = await supabase
      .from("reactions")
      .select('"maskTier"')
      .eq("post_id", post.id)
      .eq("post_type", "vision");

    const rows: ReactionRow[] = reactionRows ?? [];

    const newCounts = {
      mask1: rows.filter((r) => r.maskTier === 1).length,
      mask2: rows.filter((r) => r.maskTier === 2).length,
      mask3: rows.filter((r) => r.maskTier === 3).length,
      mask4: rows.filter((r) => r.maskTier === 4).length,
      mask5: rows.filter((r) => r.maskTier === 5).length,
      mask6: rows.filter((r) => r.maskTier === 6).length,
    };

    setLocalReactions(newCounts);
    setLocalTotalReactions(rows.length);

    const newSpirit = rows.reduce((sum, r) => sum + r.maskTier, 0);
    const positiveCount = rows.filter((r) => r.maskTier >= 3).length;
    const totalCount = rows.length;

    const newPositivity = totalCount > 0 ? positiveCount / totalCount : 0.5;

    let newAutoMask = 2;
    if (newSpirit > 20) newAutoMask = 3;
    if (newSpirit > 100) newAutoMask = 4;
    if (newSpirit > 300) newAutoMask = 5;
    if (newSpirit > 500) newAutoMask = 6;

    setLocalSpirit(newSpirit);
    setLocalPositivity(newPositivity);
    setLocalMask(newAutoMask);

    router.refresh();
  }

  const isCreator = user?.id === post.creator_id;
  const isPositive = localMask >= 3;

  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);

  const [gateData, setGateData] = useState<any | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) throw new Error("Gatekeeper failed");
      return await res.json();
    } catch {
      return {
        rewriteNeeded: false,
        autoApprove: true,
        finalText: rawText || "",
        automask: 2,
        positivityRatio: 0.5,
      };
    }
  }

  async function insertComment(
    finalText: string,
    automask: number,
    positivity: number
  ) {
    if (!finalText || finalText.trim().length === 0) {
      setCommentError("Comment cannot be empty.");
      return false;
    }

    const { error } = await supabase
      .from("vision_post_comments")
      .insert({
        post_id: post.id,
        user_id: user?.id,
        content: finalText,
        raw_input: commentText || "",
        automask,
        positivity_ratio: positivity,
      });

    if (error) {
      console.error(error);
      setCommentError("Failed to post comment.");
      return false;
    }

    router.refresh();
    return true;
  }

  async function submitComment() {
    setCommentError("");

    if (!user) {
      setCommentError("You must be loggedlogged in to comment.");
      return;
    }

    if (!commentText.trim()) {
      setCommentError("Please enter a comment.");
      return;
    }

    setLoadingComment(true);

    const gate = await runGatekeeper(commentText.trim());

    const safeFinalText = gate.finalText ?? commentText.trim();
    const safePositivity = gate.positivityRatio ?? 0.5;
    const safeAutomask = gate.automask ?? 2;

    if (gate.autoApprove && !gate.rewriteNeeded) {
      if (!safeFinalText.trim()) {
        setCommentError("Comment cannot be empty.");
        setLoadingComment(false);
        return;
      }

      const ok = await insertComment(
        safeFinalText,
        safeAutomask,
        safePositivity
      );

      if (ok) {
        setCommentText("");

        if (safePositivity >= 0.6 || safeAutomask >= 3) {
          setToastMessage("Your words uplift the spirits ✨");
        }
      }

      setLoadingComment(false);
      return;
    }

    if (gate.rewriteNeeded) {
      setGateData({
        ...gate,
        finalText: safeFinalText,
        positivityRatio: safePositivity,
        automask: safeAutomask,
      });
      setShowGateModal(true);
      setLoadingComment(false);
      return;
    }

    if (!safeFinalText.trim()) {
      setCommentError("Comment cannot be empty.");
      setLoadingComment(false);
      return;
    }

    const ok = await insertComment(
      safeFinalText,
      safeAutomask,
      safePositivity
    );

    if (ok) setCommentText("");

    setLoadingComment(false);
  }

  async function acceptRewrite(rewrite: string) {
    if (!rewrite || rewrite.trim().length === 0) {
      setCommentError("Rewrite cannot be empty.");
      return;
    }

    setLoadingComment(true);

    const ok = await insertComment(
      rewrite.trim(),
      gateData?.automask ?? 2,
      gateData?.positivityRatio ?? 0.5
    );

    if (ok) {
      setCommentText("");
      setGateData(null);
      setShowGateModal(false);

      const positivity = gateData?.positivityRatio ?? 0.5;
      const automask = gateData?.automask ?? 2;

      if (positivity >= 0.6 || automask >= 3) {
        setToastMessage("Your words uplift the spirits ✨");
      }
    }

    setLoadingComment(false);
  }

  return (
    <div
      ref={cardRef}
      data-vision-card
      className="bg-gray-900 rounded-xl p-4 mb-6 shadow-lg"
    >
      {toastMessage && (
        <SpiritToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ⭐ Corrected Creator Profile Link */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/profile/${post.creator_id}?from=vision`}
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <img
            src={safeAvatar}
            onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
            className={`${mainAvatarSize} rounded-full border border-gray-700`}
            alt="avatar"
          />

          <span className="text-purple-200 font-semibold">
            {post.users?.username ?? "unknown"}
          </span>

          {isCreator && (
            <span className="text-xs bg-purple-700 px-2 py-1 rounded text-white">
              Creator
            </span>
          )}

          {isPositive && (
            <span className="text-xs bg-green-700 px-2 py-1 rounded text-white">
              ✨ Uplifting
            </span>
          )}
        </Link>
      </div>

      {post.title && (
        <h2 className="text-xl font-semibold mb-2 text-purple-200">
          {post.title}
        </h2>
      )}

      <div className="mb-4 relative">
        {safeMedia ? (
          isVideo ? (
            <>
              <video
                ref={videoRef}
                src={safeMedia}
                muted={muted}
                playsInline
                className="rounded-lg w-full"
              />
              <button
                onClick={() => setMuted(!muted)}
                className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </>
          ) : (
            <img
              src={safeMedia}
              className="rounded-lg w-full"
              alt="vision media"
            />
          )
        ) : null}
      </div>

      <div className="text-gray-300 mb-3 text-sm">
        <p>SpiritScore: {localSpirit}</p>
        <p>Positivity: {Math.round(localPositivity * 100)}%</p>
        <p>Mask: {localMask}</p>
        <p>Reactions: {localTotalReactions}</p>
      </div>

      <ReactionBar
        postType="vision"
        postId={post.id}
        creatorId={post.creator_id}
        reactions={localReactions}
        spiritScore={localSpirit}
        positivityRatio={localPositivity}
        onReact={refreshReactions}
      />

      <div className="mt-3">
        <VisionShareButton
          postId={post.id}
          title={post.title}
          imageUrl={post.media_url ?? ""}
          creatorUsername={post.users?.username ?? "unknown"}
        />
      </div>

      {/* ⭐ DELETE BUTTON — ONLY FOR CREATOR */}
      {isCreator && (
        <button
          onClick={async () => {
            try {
              // 1. Delete post (cascade deletes reactions)
              const { error: deleteError } = await supabase
                .from("vision_posts")
                .delete()
                .eq("id", post.id);

              if (deleteError) {
                console.error("Error deleting post:", deleteError);
                return;
              }

              // 2. Delete video file
              if (post.media_url) {
                const mediaPath = post.media_url.split("/vision/")[1];
                if (mediaPath) {
                  await supabase.storage.from("vision").remove([mediaPath]);
                }
              }

              // 3. Delete thumbnail file
              if (post.thumbnail_url) {
                const thumbPath = post.thumbnail_url.split("/vision-thumbnails/")[1];
                if (thumbPath) {
                  await supabase.storage
                    .from("vision-thumbnails")
                    .remove([thumbPath]);
                }
              }

              // 4. Remove from feed UI
              if (typeof post.onDeleted === "function") {
                post.onDeleted(post.id);
              }

              router.refresh();
            } catch (err) {
              console.error("Delete failed:", err);
            }
          }}
          className="mt-3 bg-red-600 px-4 py-2 rounded text-sm hover:bg-red-500"
        >
          Delete Vision
        </button>
      )}

      {post.comments && post.comments.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-300 text-sm font-medium mb-2">
            💬 {post.comment_count} comments
          </p>

          {post.comments.slice(0, 2).map((comment: any) => (
            <div key={comment.id} className="mb-3">
              <div className="flex items-center gap-2">
                <img
                  src={comment.profiles?.avatar_url || FALLBACK_AVATAR}
                  className={`${commentAvatarSize} rounded-full`}
                />
                <span className="text-sm font-semibold text-purple-200">
                  {comment.profiles?.username || "unknown"}
                </span>
              </div>

              <p className="ml-8 text-gray-400 text-sm">{comment.content}</p>
            </div>
          ))}

          {post.comment_count > 2 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-purple-300 hover:text-purple-200 text-sm mt-2 underline"
            >
              View all comments →
            </button>
          )}
        </div>
      )}

      <div className="mt-4 bg-gray-800 p-3 rounded-lg">
        <textarea
          className="w-full bg-gray-700 text-white rounded p-2 text-sm"
          placeholder="Write a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={2}
        />

        {commentError && (
          <p className="text-red-400 text-sm mt-1">{commentError}</p>
        )}

        {showGateModal && gateData && (
          <div className="bg-gray-700 p-3 rounded mt-3 border border-yellow-500/40">
            <p className="text-yellow-300 text-sm mb-2">
              The spirits suggest a more uplifting version:
            </p>

            {(gateData.rewrites || []).map((r: string, idx: number) => (
              <button
                key={idx}
                onClick={() => acceptRewrite(r)}
                className="block w-full text-left p-2 mb-2 bg-neutral-600 rounded hover:bg-neutral-500"
              >
                {r}
              </button>
            ))}

            <button
              onClick={() => setShowGateModal(false)}
              className="bg-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-500"
            >
              Keep original
            </button>
          </div>
        )}

        <button
          onClick={submitComment}
          disabled={loadingComment}
          className="mt-2 bg-purple-600 px-4 py-2 rounded text-sm hover:bg-purple-500 disabled:opacity-50"
        >
          {loadingComment ? "Posting…" : "Post comment"}
        </button>
      </div>

      <p className="text-gray-400 text-sm mt-3">
        {post.created_at ? new Date(post.created_at).toLocaleString() : ""}
      </p>
    </div>
  );
}
