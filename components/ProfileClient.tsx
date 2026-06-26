// vercel rebuild 001
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import PostCard from "@/components/plaza/PostCard";
import AvatarUploader from "@/components/AvatarUploader";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  mask_tier: number;
  spirit_score: number;
  positivity_ratio: number;
  created_at: string;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  mask: number;
  automask: number | null;
  positivity_ratio: number;
};

const EMPTY_REACTIONS = {
  mask1: 0,
  mask2: 0,
  mask3: 0,
  mask4: 0,
  mask5: 0,
  mask6: 0,
};

export default function ProfileClient({
  userId,
  profile,
  posts,
}: {
  userId: string;
  profile: Profile;
  posts: Post[];
}) {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"posts" | "soundposts" | "reactions">("posts");

  const [gridMode, setGridMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Record<string, any>>({});

  useEffect(() => setHydrated(true), []);

  // Load reactions
  useEffect(() => {
    async function loadReactions() {
      if (!posts || posts.length === 0) return;

      const { data, error } = await supabase
        .from("reactions")
        .select('post_id, "maskTier"')
        .in("post_id", posts.map((p) => p.id));

      if (error) {
        console.error("Reaction load error:", error);
        return;
      }

      const map: Record<string, any> = {};

      data.forEach((r: { post_id: string; maskTier: number }) => {
        if (!map[r.post_id]) map[r.post_id] = { ...EMPTY_REACTIONS };
        map[r.post_id][`mask${r.maskTier}`] += 1;
      });

      setReactionCounts(map);
    }

    loadReactions();
  }, [posts, supabase]);

  if (!hydrated || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  const isOwnProfile = user.id === profile.id;

  return (
    <>
      {/* BUILD MARKER */}
      <div className="w-full bg-red-600 text-white text-center py-1 text-xs">
        BUILD MARKER 2: PROFILECLIENT ACTIVE
      </div>

      <div className="min-h-screen bg-black text-white p-6 space-y-8">

        {/* PROFILE HEADER */}
        <div className="flex items-center gap-4 relative">

          {/* FIXED AVATAR WRAPPER */}
          <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
            {isOwnProfile ? (
              <AvatarUploader
                userId={profile.id}
                currentAvatar={profile.avatar_url}
              />
            ) : (
              <img
                src={profile.avatar_url || FALLBACK_AVATAR}
                onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                className="w-24 h-24 rounded-full object-cover border border-white/20"
              />
            )}
          </div>

          {/* NAME + USERNAME */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold">{profile.display_name}</h1>
            <p className="text-white/60">@{profile.username}</p>
          </div>

        </div>

        {/* STATS */}
        <div className="flex gap-8 text-white/80 text-sm">
          <div><span className="font-bold">{profile.spirit_score}</span> Spirit</div>
          <div><span className="font-bold">{profile.mask_tier}</span> Mask Tier</div>
          <div><span className="font-bold">{profile.positivity_ratio}%</span> Positivity</div>
        </div>

        {/* BIO */}
        {profile.bio && (
          <p className="text-white/80 leading-relaxed">{profile.bio}</p>
        )}

        {/* JOIN DATE */}
        <p className="text-white/40 text-xs">
          Joined {new Date(profile.created_at).toLocaleDateString()}
        </p>

        {/* TABS */}
        <div className="flex gap-6 border-b border-white/10 pb-2 text-sm">
          <button
            onClick={() => setActiveTab("posts")}
            className={activeTab === "posts" ? "text-white font-semibold" : "text-white/50"}
          >
            Posts
          </button>

          <button
            onClick={() => setActiveTab("soundposts")}
            className={activeTab === "soundposts" ? "text-white font-semibold" : "text-white/50"}
          >
            Soundposts
          </button>

          <button
            onClick={() => setActiveTab("reactions")}
            className={activeTab === "reactions" ? "text-white font-semibold" : "text-white/50"}
          >
            Reactions
          </button>
        </div>

        {/* GRID MODE TOGGLE */}
        {activeTab === "posts" && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setGridMode((prev) => !prev)}
              className="text-xs text-white/60 hover:text-white transition"
            >
              {gridMode ? "List View" : "Grid View"}
            </button>
          </div>
        )}

        {/* CONTENT */}
        <div className="mt-4">

          {activeTab === "posts" && (
            <div className={gridMode ? "grid grid-cols-2 gap-4" : "space-y-6"}>

              {posts && posts.length > 0 ? (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className={
                      gridMode
                        ? "animate-fadeInUp"
                        : "pb-4 border-b border-white/10 last:border-b-0 animate-fadeInUp"
                    }
                  >
                    <PostCard
                      post={{
                        id: post.id,
                        creator_id: profile.id,
                        content: post.content,
                        created_at: post.created_at,
                        spirit_score: post.spirit_score,
                        autoMask: post.automask ?? 0,
                      }}
                      reactions={reactionCounts[post.id] ?? EMPTY_REACTIONS}
                      positivityRatio={post.positivity_ratio}
                      onReact={() => {}}
                      showDelete={isOwnProfile}
                      onDelete={async (postId) => {
                        await supabase.from("posts").delete().eq("id", postId);
                        router.refresh();
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-white/40">No posts yet…</p>
              )}

            </div>
          )}

          {activeTab === "soundposts" && (
            <p className="text-white/40">No soundposts yet…</p>
          )}

          {activeTab === "reactions" && (
            <p className="text-white/40">No reactions yet…</p>
          )}

        </div>
      </div>
    </>
  );
}
