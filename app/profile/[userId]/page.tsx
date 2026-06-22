"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";
import ReactionBar from "@/components/plaza/ReactionBar";

interface UserProfile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  spirit_score: number | null;
  mask_tier: number | null;
  positivity_ratio: number | null;
}

interface ReactionRow {
  post_id: string;
  maskTier: number;
  value: number | null;
}

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface UserPost {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number | null;
  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const supabase = useSupabase();

  const [sessionReady, setSessionReady] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ Reliable session resolver using onAuthStateChange
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setSessionReady(true);

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        if (params.userId === "me") {
          setResolvedUserId(session.user.id);
        } else {
          setResolvedUserId(params.userId);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [params.userId, supabase, router]);

  // ⭐ Load profile + posts
  const loadProfile = useCallback(async () => {
    if (!resolvedUserId) return;

    setLoading(true);

    // Load user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", resolvedUserId)
      .maybeSingle();

    if (userError) {
      console.error("Profile load error:", userError);
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!userData) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const typedProfile = userData as UserProfile;
    setProfile(typedProfile);

    // Load posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", resolvedUserId)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Posts load error:", postsError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const typedPosts = (postsData ?? []) as any[];
    const postIds = typedPosts.map((p) => p.id);

    let typedReactions: ReactionRow[] = [];

    // Only query reactions if there are posts
    if (postIds.length > 0) {
      const { data: reactionsData, error: reactionsError } = await supabase
        .from("reactions")
        .select("post_id, maskTier, value")
        .in("post_id", postIds);

      if (reactionsError) {
        console.error("Reactions load error:", reactionsError);
        typedReactions = [];
      } else {
        typedReactions = (reactionsData ?? []) as ReactionRow[];
      }
    }

    // Merge posts + reactions
    const merged: UserPost[] =
      typedPosts.length > 0
        ? typedPosts.map((post) => {
            const postReactions = typedReactions.filter(
              (r) => r.post_id === post.id
            );

            const counts: ReactionCounts = {
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
          })
        : [];

    setPosts(merged);
    setLoading(false);
  }, [supabase, resolvedUserId]);

  // ⭐ Load after session + userId resolved
  useEffect(() => {
    if (sessionReady && resolvedUserId) {
      loadProfile();
    }
  }, [sessionReady, resolvedUserId, loadProfile]);

  // ⭐ Loading screen
  if (!sessionReady || !resolvedUserId || loading) {
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
          <div
            className="relative group cursor-pointer"
            onClick={() => router.push(`/profile/${resolvedUserId}/edit`)}
          >
            <img
              src={avatarUrl}
              alt="avatar"
              className="relative z-10 w-32 h-32 rounded-full object-cover border border-zinc-700 shadow-xl bg-zinc-900 transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== "/fallback-avatar.png") {
                  target.src = "/fallback-avatar.png";
                }
              }}
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl font-semibold tracking-wide">{username}</h1>
            <p className="text-zinc-400 text-sm mt-1">{bio}</p>
          </div>
        </div>

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
              postType="plaza"
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
