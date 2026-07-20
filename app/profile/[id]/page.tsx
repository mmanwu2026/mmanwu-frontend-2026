// ⭐ Server Component — DO NOT add "use client"
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/app/components/ProfileClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⭐ Promise params — correct for your project
  const { id } = await params;

  // ⭐ Use your existing authenticated server-side Supabase client
  const supabase = await createSupabaseServerClient();

  // ⭐ Viewer identity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;

  // ⭐ Fetch profile by ID
  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      display_name,
      avatar_url,
      bio,
      mask_tier,
      spirit_score,
      positivity_ratio,
      created_at,
      followers_count,
      following_count,
      location,
      website_url,
      verified,
      privacy_type
    `
    )
    .eq("id", id)
    .single();

  // ⭐ Profile not found
  if (!profileRaw || profileError) {
    return (
      <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
        <div className="mt-6 text-lg font-semibold">Profile not found</div>
      </div>
    );
  }

  // ⭐ Privacy enforcement
  const isOwner = viewerId === profileRaw.id;
  const isPrivate = profileRaw.privacy_type === "private";

  if (isPrivate && !isOwner) {
    return (
      <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
        <div className="mt-20 text-center">
          <p className="text-xl font-semibold">This profile is private.</p>
          <p className="text-sm text-gray-600 mt-2">
            Only the owner can view this profile.
          </p>
        </div>
      </div>
    );
  }

  // ⭐ Fetch posts
  const { data: postsRaw } = await supabase
    .from("posts")
    .select(
      `
      id,
      creator_id,
      content,
      created_at,
      spirit_score,
      automask,
      positivity_ratio
    `
    )
    .eq("creator_id", id)
    .order("created_at", { ascending: false });

  const posts = postsRaw ?? [];

  // ⭐ Prepare profile object
  const profile = {
    ...profileRaw,
    is_private: profileRaw.privacy_type === "private",
    posts,
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
      <ProfileClient profile={profile} posts={posts} />
    </div>
  );
}
