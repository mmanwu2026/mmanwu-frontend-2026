"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import ReactionBar from "@/components/plaza/ReactionBar";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const userId = params.userId;

  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ FIX: loadProfile MUST be inside the component, after state and supabase
  async function loadProfile() {
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setProfile(userData || {});

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    setPosts(postsData || []);
    setLoading(false);
  }

  // Wait for session hydration
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      } else {
        setSessionReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  // Load profile AFTER session is ready
  useEffect(() => {
    if (!sessionReady) return;
    loadProfile();
  }, [sessionReady, userId, supabase]);


  if (loading || !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-red-400">Profile not found.</p>
      </div>
    );
  }

  const username = profile.username || "Unknown";
  const avatarLetter = username.charAt(0).toUpperCase();
  const bio = profile.bio || "No bio yet.";
  const spiritScore = profile.spirit_score ?? 0;
  const maskTier = profile.mask_tier ?? 0;
  const positivity = Math.round((profile.positivity_ratio ?? 0.5) * 100);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Profile Header */}
      <div className="max-w-2xl mx-auto mb-8 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
            {avatarLetter}
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{username}</h1>
            <p className="text-zinc-400 text-sm">{bio}</p>
          </div>
        </div>

        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <span className="font-semibold">{spiritScore}</span>{" "}
            <span className="text-zinc-400">Spirit Score</span>
          </div>

          <div>
            <span className="font-semibold">{maskTier}</span>{" "}
            <span className="text-zinc-400">Mask Tier</span>
          </div>

          <div>
            <span className="font-semibold">{positivity}%</span>{" "}
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
            <p className="text-sm mb-3">{post.content}</p>

<ReactionBar
  postId={post.id}
  creatorId={post.creator_id}
  reactions={{
    mask1: post.mask1,
    mask2: post.mask2,
    mask3: post.mask3,
    mask4: post.mask4,
    mask5: post.mask5,
    mask6: post.mask6,
  }}
  spiritScore={post.spirit_score ?? post.spiritScore ?? 0}   /* ⭐ REQUIRED */
  positivityRatio={post.positivityRatio}
  onReact={loadProfile}
/>
          </div>
        ))}
      </div>
    </div>
  );
}
