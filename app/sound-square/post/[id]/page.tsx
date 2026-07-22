"use client";

import { useEffect, useState, useRef } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import Link from "next/link";
import TopBar from "@/components/navigation/TopBar";
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";
import SoundComments from "@/components/sound-square/SoundComments";
import SoundCommentList from "@/components/sound-square/SoundCommentList";
import SoundShareButton from "@/components/sound-square/SoundShareButton";

type SoundPostDetailCard = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  automask: number;
  share_count: number;
  share_score: number;
  privacy_type: "public" | "private";
  users: {
    username: string;
    avatar_url: string | null;
  };
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
};

export default function SoundSquarePostDetail({ params }: { params: { id: string } }) {
  const { supabase } = useSupabase();
  const [post, setPost] = useState<SoundPostDetailCard | null>(null);
  const [loading, setLoading] = useState(true);

  const [uid, setUid] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load auth user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: rows, error } = await supabase
        .from("sound_posts")
        .select(`
          id,
          title,
          audio_url,
          creator_id,
          created_at,
          spirit_score,
          positivity_ratio,
          automask,
          privacy_type,
          users:creator_id ( username, avatar_url )
        `)
        .eq("id", params.id)
        .limit(1);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const raw = rows?.[0] ?? null;
      if (!raw) {
        setPost(null);
        setLoading(false);
        return;
      }

      // Load follow state
      if (uid && uid !== raw.creator_id) {
        const { data: followRows } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", raw.creator_id)
          .limit(1);

        setIsFollowing(!!followRows?.[0]);
      }

      // Privacy enforcement
      const isCreator = uid === raw.creator_id;
      const isAllowed =
        raw.privacy_type === "public" ||
        isCreator ||
        isFollowing === true;

      if (!isAllowed) {
        setPost({
          id: raw.id,
          title: raw.title,
          audio_url: "",
          creator_id: raw.creator_id,
          created_at: raw.created_at,
          spirit_score: 0,
          positivity_ratio: 0.5,
          automask: 2,
          share_count: 0,
          share_score: 0,
          privacy_type: raw.privacy_type,
          users: raw.users,
          reactions: {
            mask1: 0,
            mask2: 0,
            mask3: 0,
            mask4: 0,
            mask5: 0,
            mask6: 0,
          },
        });
        setLoading(false);
        return;
      }

      // Load shares
      const { data: shareRows } = await supabase
        .from("sound_post_shares")
        .select("post_id")
        .eq("post_id", raw.id);

      const share_count = shareRows?.length ?? 0;
      const share_score = share_count * 5;

      // Load reactions
      const { data: reactionRows } = await supabase
        .from("reactions")
        .select("maskTier, value")
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
      let weightedPositive = 0;
      let weightedTotal = 0;

      (reactionRows || []).forEach((r) => {
        const key = `mask${r.maskTier}` as keyof typeof counts;
        counts[key] += 1;

        spirit += r.maskTier;

        weightedTotal += Math.abs(r.value ?? 0);
        if ((r.value ?? 0) > 0) weightedPositive += r.value ?? 0;
      });

      const positivity = weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

      let automask = 2;
      if (spirit <= 20) automask = 2;
      else if (spirit <= 100) automask = 3;
      else if (spirit <= 200) automask = 4;
      else if (spirit <= 500) automask = 5;
      else automask = 6;

      const card: SoundPostDetailCard = {
        id: raw.id,
        title: raw.title,
        audio_url: raw.audio_url,
        creator_id: raw.creator_id,
        created_at: raw.created_at,
        spirit_score: spirit,
        positivity_ratio: positivity,
        automask,
        share_count,
        share_score,
        privacy_type: raw.privacy_type,
        users: raw.users,
        reactions: counts,
      };

      setPost(card);
      setLoading(false);
    })();
  }, [params.id, supabase, uid, isFollowing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-6">
        <TopBar />
        <p>Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-6">
        <TopBar />
        <p>Post not found.</p>
      </div>
    );
  }

  // Block private content
  if (post.privacy_type === "private" && !isFollowing && uid !== post.creator_id) {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-6">
        <TopBar />
        <p className="text-gray-500 text-center mt-10">
          This sound post is private.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <TopBar />

      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>

      <p className="text-gray-600 mb-4">
        Uploaded by{" "}
        <Link
          href={`/profile/${post.creator_id}`}
          className="text-purple-600 hover:text-purple-700 underline"
        >
          {post.users.username}
        </Link>{" "}
        • {new Date(post.created_at).toLocaleString()}
      </p>

      <audio
        ref={audioRef}
        src={post.audio_url}
        controls
        className="w-full mb-6 rounded-lg bg-neutral-900"
      />

      <SoundReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={post.reactions}
        onReactAction={async () => {
          const { data: reactionRows } = await supabase
            .from("reactions")
            .select("maskTier, value")
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
          let weightedPositive = 0;
          let weightedTotal = 0;

          (reactionRows || []).forEach((r) => {
            const key = `mask${r.maskTier}` as keyof typeof counts;
            counts[key] += 1;

            spirit += r.maskTier;

            weightedTotal += Math.abs(r.value ?? 0);
            if ((r.value ?? 0) > 0) weightedPositive += r.value ?? 0;
          });

          const positivity = weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

          let automask = 2;
          if (spirit <= 20) automask = 2;
          else if (spirit <= 100) automask = 3;
          else if (spirit <= 200) automask = 4;
          else if (spirit <= 500) automask = 5;
          else automask = 6;

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

      <SoundComments postId={post.id} onSubmittedAction={() => {}} />
      <SoundCommentList postId={post.id} />
    </div>
  );
}
