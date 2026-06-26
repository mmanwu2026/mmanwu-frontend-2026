import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch profile
  const { data: profile } = await supabase
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
    followers_count,
    following_count
  `)
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
    <ProfileClient
      userId={id}
      profile={profile}
      posts={posts || []}
    />
  );
}
