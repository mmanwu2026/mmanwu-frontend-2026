"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ReactionBar from "@/components/plaza/ReactionBar";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const userId = params.userId;

  const supabase = createSupabaseBrowserClient();

  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ Check session immediately on mount
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSessionReady(true);
      } else {
        router.replace("/login");
      }
    }

    checkSession();
  }, [router, supabase]);

  // ⭐ Listen for auth changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionReady(true);
      } else {
        router.replace("/login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  // ⭐ Load profile AFTER session is ready
  useEffect(() => {
    if (sessionReady && userId) {
      loadProfile();
    }
  }, [sessionReady, userId]);

  // ⭐ Hydration-safe profile loader
  async function loadProfile() {
    setLoading(true);

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!userData) {
      setLoading(false);
      return;
    }

    setProfile(userData);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    const postIds = postsData?.map((p) => p.id) ?? [];

    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .in("post_id", postIds);

    const merged = (postsData ?? []).map((post) => {
      const postReactions = (reactionsData ?? []).filter(
        (r) => r.post_id === post.id
      );

      const counts = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      const spiritScore = post.spirit_score ?? 0;

      const weightedPositive = postReactions
        .filter((r) => (r.value ?? 0) > 0)
        .reduce((sum, r) => sum + (r.value ?? 0), 0);

      const weightedTotal = Math.abs(spiritScore);
      const positivityRatio =
        weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

      return {
        ...post,
        reactions: counts,
        spiritScore,
        positivityRatio,
      };
    });

    setPosts(merged);
    setLoading(false);
  }

  // ⭐ Loading state
  if (loading || !sessionReady || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  // ⭐ Profile not found
  if (!profile?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-red-400">Profile not found.</p>
      </div>
    );
  }

  const username = profile.username || "Unknown";
  const avatarUrl = profile.avatar_url || "/fallback-avatar.png";
  const bio = profile.bio || "No bio yet.";
  const spiritScore = profile.spirit_score ?? 0;
  const maskTier = profile.mask_tier ?? 0;
  const positivity = Math.round((profile.positivity_ratio ?? 0.5) * 100);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Profile Header */}
      <div className="max-w-2xl mx-auto mb-10 border-b border-zinc-800 pb-10">

        <div className="flex items-center gap-8">

          {/* Avatar */}
          <div
            className="relative group cursor-pointer"
            onClick={() => router.push(`/profile/${userId}/edit`)}
          >
            <img
              src={avatarUrl}
              alt="avatar"
              className="
                relative z-10 w-32 h-32 rounded-full object-cover
                border border-zinc-700 shadow-xl bg-zinc-900
                transition-transform duration-300 group-hover:scale-105
              "
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== "/fallback-avatar.png") {
                  target.src = "/fallback-avatar.png";
                }
              }}
            />
          </div>

          {/* Username + Bio */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-semibold tracking-wide">
              {username}
            </h1>

            <p className="text-zinc-400 text-sm mt-1">
              {bio}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-10 mt-8 text-sm">
          <div>
            <span className="font-semibold text-lg">{spiritScore}</span>{" "}
            <span className="text-zinc-400">Spirit Score</span>
          </div>

          <div>
            <span className="font-semibold text-lg">{maskTier}</span>{" "}
            <span className="text-zinc-400">Mask Tier</span>
          </div>

          <div>
            <span className="font-semibold text-lg">{positivity}%</span>{" "}
            <span className="text-zinc-400">Positivity</span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-2xl mx-auto space-y-6">
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center">No posts yet.</p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"
          >
            <p className="text-sm mb-3 whitespace-pre-line">{post.content}</p>

            <ReactionBar
              postId={post.id}
              creatorId={post.creator_id}
              reactions={post.reactions}
              spiritScore={post.spiritScore}
              positivityRatio={post.positivityRatio}
              onReact={loadProfile}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
