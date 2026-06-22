"use client";

import ReactionBar from "./ReactionBar";

interface PostCardProps {
  post: {
    id: string;
    creator_id: string;
    content: string;
    created_at: string;
    spirit_score: number;
    autoMask: number;   // unified naming
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

  const spiritScore = post.spirit_score;

  const intensity =
    positivityRatio > 0.7 ? "high" :
    positivityRatio < 0.4 ? "low" :
    "mid";

  return (
    <div
      className={`
        aura-mask-${post.autoMask}
        aura-intensity-${intensity}
        relative w-full rounded-2xl transition-all duration-500
      `}
    >
      {/* ⭐ REQUIRED WRAPPER FOR GLOW ENGINE */}
      <div className="plaza-card-base p-5 rounded-2xl">

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
  postType="plaza"
  postId={post.id}
  creatorId={post.creator_id}
  reactions={reactions}
  spiritScore={spiritScore}
  positivityRatio={positivityRatio}
  onReact={onReact}
/>

      </div>
    </div>
  );
}
