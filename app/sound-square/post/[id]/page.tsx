"use client";

import { useEffect, useState, useRef } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";
import TopBar from "@/components/navigation/TopBar";

// ❌ REMOVE Plaza ReactionBar
// import ReactionBar from "@/components/plaza/ReactionBar";

// ⭐ USE SoundReactionBar
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";

import SoundComments from "@/components/sound-square/SoundComments";
import SoundCommentList from "@/components/sound-square/SoundCommentList";
import SoundShareButton from "@/components/sound-square/SoundShareButton";

export default function SoundSquarePostDetail({ params }: { params: { id: string } }) {
  const supabase = useSupabase();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Load base post
      const { data, error } = await supabase
        .from("sound_posts")
        .select(`
          *,
          users:creator_id ( username, avatar_url )
        `)
        .eq("id", params.id)
        .single();

      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      const raw = data;

      // Load reactions for this post
      const { data: reactionRows } = await supabase
        .from("reactions")
        .select("maskTier")
        .eq("post_id", raw.id)
        .eq("post_type", "sound");

      const counts = {
        mask1: 0,
        mask2: 0,
        mask3: 0,
        mask4: 0,
        mask5: 0,
        mask6: 0,
      };

      let spirit = 0;
      let positive = 0;
      let total = 0;

      (reactionRows || []).forEach((r: any) => {
        const key = `mask${r.maskTier}` as keyof typeof counts;
        counts[key] += 1;

        spirit += r.maskTier;
        total += 1;
        if (r.maskTier >= 3) positive += 1;
      });

      const positivity = total > 0 ? positive / total : 0.5;

      let automask = 2;
      if (spirit > 20) automask = 3;
      if (spirit > 100) automask = 4;
      if (spirit > 300) automask = 5;
      if (spirit > 500) automask = 6;

      const card = {
        id: raw.id,
        title: raw.title,
        audio_url: raw.audio_url,
        creator_id: raw.creator_id,
        created_at: raw.created_at,

        spirit_score: spirit,
        positivity_ratio: positivity,
        automask,

        // ⭐ INSERT THESE TWO LINES HERE
  share_count: raw.share_count ?? 0,
  share_score: raw.share_score ?? 0,
  
        users: {
          username: raw.users?.username ?? "Unknown",
          avatar_url: raw.users?.avatar_url ?? null,
        },

        reactions: counts,
      };

      setPost(card);
      setLoading(false);
    })();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6">
        <TopBar />
        <p>Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen text-white p-6">
        <TopBar />
        <p>Post not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6">
      <TopBar />

      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>

      <p className="text-gray-400 mb-4">
        Uploaded by{" "}
        <Link
          href={`/profile/${post.creator_id}`}
          className="text-purple-300 hover:text-purple-400 underline"
        >
          {post.users.username}
        </Link>
        {" "}• {new Date(post.created_at).toLocaleString()}
      </p>

      <audio
        ref={audioRef}
        src={post.audio_url}
        controls
        className="w-full mb-6 rounded-lg bg-neutral-900"
      />

      {/* ⭐ FIXED — use SoundReactionBar */}
      <SoundReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={post.reactions}
        onReact={async () => {
          // Refresh reactions after reacting
          const { data: reactionRows } = await supabase
            .from("reactions")
            .select("maskTier")
            .eq("post_id", post.id)
            .eq("post_type", "sound");

          const counts = {
            mask1: 0,
            mask2: 0,
            mask3: 0,
            mask4: 0,
            mask5: 0,
            mask6: 0,
          };

          let spirit = 0;
          let positive = 0;
          let total = 0;

          (reactionRows || []).forEach((r: any) => {
            const key = `mask${r.maskTier}` as keyof typeof counts;
            counts[key] += 1;

            spirit += r.maskTier;
            total += 1;
            if (r.maskTier >= 3) positive += 1;
          });

          const positivity = total > 0 ? positive / total : 0.5;

          let automask = 2;
          if (spirit > 20) automask = 3;
          if (spirit > 100) automask = 4;
          if (spirit > 300) automask = 5;
          if (spirit > 500) automask = 6;

          setPost({
            ...post,
            reactions: counts,
            spirit_score: spirit,
            positivity_ratio: positivity,
            automask,
          });
        }}
      />

      <SoundShareButton postId={post.id} />

      <SoundComments postId={post.id} onSubmitted={() => {}} />
      <SoundCommentList postId={post.id} />
    </div>
  );
}
