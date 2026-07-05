import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";
import TopBar from "@/components/navigation/TopBar";

// ⭐ Add Post type so TS stops complaining
type Post = {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number | null;
  positivity_ratio: number;
};

export default async function Page({ params }: { params: { id: string } }) {
  // ⭐ Correct params signature — no Promise, no await
  const { id } = params;

  console.log("PROFILE: starting supabase client");
  const supabase = await createSupabaseServerClient();
  console.log("PROFILE: supabase client created");

  console.log("PROFILE: fetching profile");
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
  console.log("PROFILE: profile fetched");

  if (profileError || !profileRaw) {
    console.log("PROFILE: profile not found or error", profileError);
    return <div className="p-6">Profile not found</div>;
  }

  const spirit_score =
    profileRaw.posts?.reduce(
      (sum: number, p: any) => sum + (p.spirit_score ?? 0),
      0
    ) ?? 0;

  const positivity_ratio =
    profileRaw.posts?.length > 0
      ? profileRaw.posts.reduce(
          (sum: number, p: any) => sum + (p.positivity_ratio ?? 0),
          0
        ) / profileRaw.posts.length
      : 0.5;

  const profile = {
    ...profileRaw,
    followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
    following_count: profileRaw.following_count?.[0]?.count ?? 0,
    spirit_score,
    positivity_ratio,
  };

  console.log("PROFILE: fetching posts");
  const { data: postsRaw } = await supabase
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
  console.log("PROFILE: posts fetched");

  // ⭐ Ensure posts is always an array
  const posts: Post[] = postsRaw ?? [];

  console.log("PROFILE: rendering ProfileClient");

  return (
    <div className="p-6 text-white">
      <TopBar />
      <ProfileClient profile={profile} posts={posts} />
    </div>
  );
}
