"use client";

import { useEffect, useState, useRef } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import TopBar from "@/components/navigation/TopBar";
import ReactionBar from "@/components/plaza/ReactionBar";
import type { CardSoundPost } from "@/app/sound-square/loadSoundPosts";

export default function SoundSquarePostDetail({ params }: { params: { id: string } }) {
  const supabase = useSupabase();
  const [post, setPost] = useState<CardSoundPost | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("sound_posts")
        .select(
          `
          *,
          users:creator_id ( username )
        `
        )
        .eq("id", params.id)
        .single();

      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      const raw = data;

      const card: CardSoundPost = {
        id: raw.id,
        title: raw.title,
        audio_url: raw.audio_url,
        creator_id: raw.creator_id,
        creator_name: raw.users?.username ?? "Unknown",
        created_at: raw.created_at,

        reactions: {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
          mask6: 0,
        },

        spiritScore: raw.spirit_score ?? 0,
        positivityRatio: raw.positivity_ratio ?? 0.5,
        autoMask: raw.automask ?? 2,
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

      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-400 mb-4">
        Uploaded by {post.creator_name} • {post.created_at}
      </p>

      <audio ref={audioRef} src={post.audio_url} controls className="w-full mb-6" />

      <ReactionBar
        postType="sound"
        postId={post.id}
        creatorId={post.creator_id}
        reactions={post.reactions}
        spiritScore={post.spiritScore}
        positivityRatio={post.positivityRatio}
        onReact={() => {}}
      />

      <p className="text-gray-500 mt-6 text-sm">
        More features coming soon: comments, waveform, share link, creator profile.
      </p>
    </div>
  );
}
