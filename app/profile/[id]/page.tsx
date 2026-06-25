import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, mask_tier, spirit_score, positivity_ratio, created_at")
    .eq("id", id)
    .single();

  if (!profile) {
    return <div className="p-6">Profile not found</div>;
  }

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

      {/* Placeholder for posts */}
      <div className="mt-10 text-white/40">Posts will appear here…</div>
    </div>
  );
}
