import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch profile with FK-based follower counts
  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      bio,
      mask_tier,
      spirit_score,
      positivity_ratio,
      created_at,
      verified,
      location,
      website_url,

      followers_count:follows!follows_following_id_fkey(count),
      following_count:follows!follows_follower_id_fkey(count)
    `)
    .eq("id", id)
    .single();

  if (profileError || !rawProfile) {
    return <div className="p-6">Profile not found</div>;
  }

  // ⭐ Convert arrays → numbers
  const profile = {
    ...rawProfile,
    followers_count: rawProfile.followers_count?.[0]?.count ?? 0,
    following_count: rawProfile.following_count?.[0]?.count ?? 0,
  };

  // Fetch posts
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      creator_id,
      content,
      created_at,
      spirit_score,
      automask,
      positivity_ratio
    `)
    .eq("creator_id", id)
    .order("created_at", { ascending: false });

  return (
    <ProfileClient
      profile={profile}
      posts={posts || []}
    />
  );
}
