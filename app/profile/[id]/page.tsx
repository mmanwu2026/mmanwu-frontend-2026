import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";
import TopBar from "@/components/navigation/TopBar";

type Post = {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number | null;
  positivity_ratio: number;
};

// ⭐ This MUST match ProfileClient’s expected type exactly
type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  mask_tier: number; // FIX — ProfileClient expects number, not string
  created_at: string;
  verified: boolean;
  location: string;
  website_url: string;
  followers_count: number;
  following_count: number;
  spirit_score: number;
  positivity_ratio: number;
  posts: Post[];
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch profile (mini-posts only)
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

  const profileNotFound = !!profileError || !profileRaw;

  let profile: Profile | null = null;
  let posts: Post[] = [];

  if (!profileNotFound && profileRaw) {
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

    // ⭐ FIX — do NOT assign mini-posts to profile.posts
    profile = {
      ...profileRaw,
      mask_tier: Number(profileRaw.mask_tier), // FIX — ensure number
      followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
      following_count: profileRaw.following_count?.[0]?.count ?? 0,
      spirit_score,
      positivity_ratio,
      posts: [], // FIX — full posts come from second query
    };

    // Fetch full posts
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

    posts = postsRaw ?? [];
  }

  return (
    <div className="p-6 text-white">
      <TopBar />
      {profileNotFound ? (
        <div className="mt-6 text-lg">Profile not found</div>
      ) : (
        <ProfileClient profile={profile!} posts={posts} />
      )}
    </div>
  );
}
