// ⭐ CLEAN PROMISE-PARAMS VERSION
// DO NOT add "use client" here — this must remain a Server Component.

import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/app/components/ProfileClient";
import MobileAuthNav from "@/app/components/AuthNav";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⭐ Promise params — safe again
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // ⭐ Reliable viewer identity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;

  // ⭐ Fetch profile
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
      is_private,
      dm_permission,

      followers_count:follows!follows_following_id_fkey(count),
      following_count:follows!follows_follower_id_fkey(count)
    `)
    .eq("id", id)
    .single();

  // ⭐ Profile not found
  if (profileError || !profileRaw) {
    return (
      <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
        <MobileAuthNav />
        <div className="mt-6 text-lg font-semibold">Profile not found</div>
      </div>
    );
  }

  // ⭐ Privacy enforcement
  const isOwner = viewerId === profileRaw.id;

  if (profileRaw.is_private && !isOwner) {
    return (
      <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
        <MobileAuthNav />
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

  const posts = postsRaw ?? [];

  // ⭐ Build final profile object
  const profile = {
    ...profileRaw,
    mask_tier: Number(profileRaw.mask_tier),
    followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
    following_count: profileRaw.following_count?.[0]?.count ?? 0,
    spirit_score: 0,
    positivity_ratio: 0.5,
    posts: [],
  };

  // ⭐ FINAL RENDER — with padding under sticky AuthNav
  return (
    <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
      <MobileAuthNav />
      <ProfileClient profile={profile} posts={posts} />
    </div>
  );
}
