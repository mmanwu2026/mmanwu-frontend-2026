import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

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
    <div className="space-y-8">
      
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          className="w-24 h-24 rounded-full border border-white/20"
        />
        <div>
          <h1 className="text-3xl font-bold">{profile.display_name}</h1>
          <p className="text-white/60">@{profile.username}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8 text-white/80 text-sm">
        <div><span className="font-bold">{profile.spirit_score}</span> Spirit</div>
        <div><span className="font-bold">{profile.mask_tier}</span> Mask Tier</div>
        <div><span className="font-bold">{profile.positivity_ratio}%</span> Positivity</div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-white/80 leading-relaxed">{profile.bio}</p>
      )}

      {/* Joined */}
      <p className="text-white/40 text-xs">
        Joined {new Date(profile.created_at).toLocaleDateString()}
      </p>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="p-4 border border-white/10 rounded-lg bg-white/5"
            >
              <p className="text-white">{post.content}</p>

              <div className="flex justify-between items-center mt-3 text-white/40 text-xs">
                <span>{new Date(post.created_at).toLocaleString()}</span>
                <span>Mask {post.mask}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-white/40">No posts yet…</p>
        )}
      </div>
    </div>
  );
}
