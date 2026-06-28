import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch profile + follower counts + all posts for aggregation
  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      bio,
      mask_tier,
      created_at,
      verified,
      location,
      website_url,

      followers_count:follows!follows_following_id_fkey(count),
      following_count:follows!follows_follower_id_fkey(count),

      posts:posts!posts_creator_id_fkey (
        id,
        spirit_score,
        positivity_ratio
      )
    `)
    .eq("id", id)
    .single();

  if (profileError || !profileRaw) {
    return <div className="p-6">Profile not found</div>;
  }

  // Compute SpiritScore = sum of all post.spirit_score
  const spirit_score = profileRaw.posts?.reduce(
    (sum: number, p: any) => sum + (p.spirit_score ?? 0),
    0
  ) ?? 0;

  // Compute positivity = average of all post.positivity_ratio
  const positivity_ratio =
    profileRaw.posts?.length > 0
      ? profileRaw.posts.reduce(
          (sum: number, p: any) => sum + (p.positivity_ratio ?? 0),
          0
        ) / profileRaw.posts.length
      : 0.5; // default baseline

  // Normalize follower/following counts
  const profile = {
    ...profileRaw,
    followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
    following_count: profileRaw.following_count?.[0]?.count ?? 0,
    spirit_score,
    positivity_ratio,
  };

  // Fetch posts for the Posts tab
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
