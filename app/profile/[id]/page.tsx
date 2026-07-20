import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/app/components/ProfileClient";
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

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  mask_tier: number;
  created_at: string;
  verified: boolean;
  location: string;
  website_url: string;
  followers_count: number;
  following_count: number;
  spirit_score: number;
  positivity_ratio: number;
  posts: Post[];
  privacy_type?: string; // ⭐ NEW
  is_private: boolean;
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // ⭐ Fetch viewer identity
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const viewerId = session?.user?.id ?? null;

  // ⭐ Fetch profile INCLUDING privacy_type
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
      privacy_type,
      is_private,

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

  // ⭐ If profile doesn't exist
  if (profileNotFound) {
    return (
      <div className="p-6 text-white">
        <TopBar />
        <div className="mt-6 text-lg">Profile not found</div>
      </div>
    );
  }

  // ⭐ Privacy enforcement
  const privacy = profileRaw.privacy_type ?? "public";
  const isOwner = viewerId === profileRaw.id;

  if (privacy === "private" && !isOwner) {
    return (
      <div className="p-6 text-white">
        <TopBar />
        <div className="mt-20 text-center">
          <p className="text-xl font-semibold">This profile is private.</p>
          <p className="text-sm text-gray-400 mt-2">
            Only the owner can view this profile.
          </p>
        </div>
      </div>
    );
  }

  // ⭐ Build profile object
  let profile: Profile | null = null;
  let posts: Post[] = [];

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

  profile = {
    ...profileRaw,
    mask_tier: Number(profileRaw.mask_tier),
    followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
    following_count: profileRaw.following_count?.[0]?.count ?? 0,
    spirit_score,
    positivity_ratio,
    posts: [],
  };

  // ⭐ Fetch full posts
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

  return (
    <div className="p-6 text-white">
      <TopBar />
      <ProfileClient profile={profile!} posts={posts} />
    </div>
  );
}
