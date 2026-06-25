import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, mask_tier, spirit_score, positivity_ratio, created_at")
    .eq("id", id)
    .single();

  if (!profile) {
    return <div className="p-6">Profile not found</div>;
  }

  // Fetch posts
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, created_at, spirit_score, mask, automask, positivity_ratio")
    .eq("creator_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="w-full min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          className="w-20 h-20 rounded-full border border-white/20"
        />
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-white/60">@{profile.username}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-white/80">
        <div><span className="font-bold">{profile.spirit_score}</span> Spirit</div>
        <div><span className="font-bold">{profile.mask_tier}</span> Mask Tier</div>
        <div><span className="font-bold">{profile.positivity_ratio}%</span> Positivity</div>
      </div>

      {/* Bio */}
      <p className="text-white/80">{profile.bio}</p>

      {/* Joined */}
      <p className="text-white/40 text-sm">
        Joined {new Date(profile.created_at).toLocaleDateString()}
      </p>

      {/* Posts */}
      <div className="mt-10 space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="p-4 border border-white/10 rounded-lg">
              <p className="text-white">{post.content}</p>
              <p className="text-white/40 text-sm mt-2">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-white/40">No posts yet…</p>
        )}
      </div>
    </div>
  );
}
