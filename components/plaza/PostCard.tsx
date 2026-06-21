"use client";

import ReactionBar from "./ReactionBar";

interface PostCardProps {
  post: {
    id: string;              
    creator_id: string;
    content: string;
    created_at: string;
    spirit_score: number;     // DB column
    autoMask: number;         // unified naming
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

  // ✅ Convert DB snake_case → UI camelCase
  const spiritScore = post.spirit_score;

  const intensity =
    positivityRatio > 0.7 ? "high" :
    positivityRatio < 0.4 ? "low" :
    "mid";

  return (
    <div
      className={`
        relative
        w-full rounded-2xl p-5 shadow-md transition-all duration-500
        border border-white/10 bg-white/5 backdrop-blur
        aura-mask-${post.autoMask}
        aura-intensity-${intensity}
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
          {post.autoMask === 2 && "😤"}
          {post.autoMask === 3 && "😊"}
          {post.autoMask === 4 && "🤩"}
          {post.autoMask === 5 && "😇"}
          {post.autoMask === 6 && "🔱"}
        </div>

        <div className="flex flex-col">
          <span className="text-white/90 text-sm font-semibold">
            {post.creator_id}
          </span>
          <span className="text-white/40 text-xs">
            Spirit Score: {spiritScore}
          </span>
        </div>
      </div>

      <p className="text-white/90 whitespace-pre-wrap mb-4">
        {post.content}
      </p>

      <ReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={reactions}
        spiritScore={spiritScore}         // ✅ unified
        positivityRatio={positivityRatio}
        onReact={onReact}
      />
    </div>
  );
}
