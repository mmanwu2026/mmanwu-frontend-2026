"use client";

import ReactionBar from "./ReactionBar";

interface PostCardProps {
  post: {
    id: number;
    creator_id: string;
    content: string;
    created_at: string;
    spirit_score: number;
    automask: number;
  };
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
  positivityRatio: number;
  onReact: () => void;
}

export default function PostCard({
  post,
  reactions,
  positivityRatio,
  onReact,
}: PostCardProps) {
  const intensity =
    positivityRatio > 0.7 ? "high" : positivityRatio < 0.4 ? "low" : "mid";

  return (
    <div
      className={`
        relative
        w-full rounded-2xl p-5 shadow-md transition-all duration-500
        border border-white/10 bg-white/5 backdrop-blur
        aura-mask-${post.automask}
        aura-intensity-${intensity}
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
          {post.automask === 2 && "😤"}
          {post.automask === 3 && "😊"}
          {post.automask === 4 && "🤩"}
          {post.automask === 5 && "😇"}
          {post.automask === 6 && "🔱"}
        </div>

        <div className="flex flex-col">
          <span className="text-white/90 text-sm font-semibold">
            {post.creator_id}
          </span>
          <span className="text-white/40 text-xs">
            Spirit Score: {post.spirit_score}
          </span>
        </div>
      </div>

      <p className="text-white/90 whitespace-pre-wrap mb-4">
        {post.content}
      </p>

      <ReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={{
          mask1: reactions.mask1,
          mask2: reactions.mask2,
          mask3: reactions.mask3,
          mask4: reactions.mask4,
          mask5: reactions.mask5,
          mask6: reactions.mask6,
        }}
        spiritScore={post.spirit_score}
        positivityRatio={positivityRatio}
        onReact={onReact}
      />
    </div>
  );
}
