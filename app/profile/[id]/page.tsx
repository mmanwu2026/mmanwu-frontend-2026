// ⭐ DIAGNOSTIC VERSION — ALWAYS RENDERS SOMETHING
// DO NOT add "use client" here.

import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/app/components/ProfileClient";
import TopBar from "@/components/navigation/TopBar";

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  // ⭐ Step 1 — Confirm params work
  const id = params.id;
  console.log("🔍 DIAGNOSTIC: PROFILE PAGE LOADED WITH ID =", id);

  // ⭐ Step 2 — Create Supabase client
  const supabase = await createSupabaseServerClient();

  // ⭐ Step 3 — Get viewer session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const viewerId = session?.user?.id ?? null;
  console.log("🔍 DIAGNOSTIC: VIEWER ID =", viewerId);

  // ⭐ Step 4 — Fetch profile
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

  console.log("🔍 DIAGNOSTIC: PROFILE RAW =", profileRaw);
  console.log("🔍 DIAGNOSTIC: PROFILE ERROR =", profileError);

  // ⭐ Step 5 — If profile missing, show diagnostic
  if (!profileRaw) {
    return (
      <div className="p-6 text-white">
        <TopBar />
        <p className="mt-6 text-lg">❌ Profile not found</p>
        <p className="mt-2 text-sm text-gray-400">ID: {id}</p>
      </div>
    );
  }

  // ⭐ Step 6 — Privacy diagnostic
  const isOwner = viewerId === profileRaw.id;
  console.log("🔍 DIAGNOSTIC: is_private =", profileRaw.is_private);
  console.log("🔍 DIAGNOSTIC: isOwner =", isOwner);

  if (profileRaw.is_private && !isOwner) {
    return (
      <div className="p-6 text-white">
        <TopBar />
        <div className="mt-20 text-center">
          <p className="text-xl font-semibold">🔒 Private Profile</p>
          <p className="text-sm text-gray-400 mt-2">
            Viewer ID: {viewerId ?? "null"}  
            <br />
            Owner ID: {profileRaw.id}
          </p>
        </div>
      </div>
    );
  }

  // ⭐ Step 7 — Fetch posts
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

  console.log("🔍 DIAGNOSTIC: POSTS RAW =", postsRaw);

  // ⭐ Step 8 — Build profile object
  const profile = {
    ...profileRaw,
    mask_tier: Number(profileRaw.mask_tier),
    followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
    following_count: profileRaw.following_count?.[0]?.count ?? 0,
    spirit_score: 0,
    positivity_ratio: 0.5,
    posts: [],
  };

  console.log("🔍 DIAGNOSTIC: FINAL PROFILE OBJ =", profile);

  // ⭐ Step 9 — Render diagnostic wrapper + ProfileClient
  return (
    <div className="p-6 text-white">
      <TopBar />

      <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700 rounded">
        <p className="font-semibold text-purple-300">🔍 DIAGNOSTIC MODE ACTIVE</p>
        <p className="text-sm text-purple-200 mt-2">
          If the page goes blank below this box, ProfileClient is crashing.
        </p>
        <p className="text-xs text-purple-300 mt-2">
          profile.id: {profile.id}  
          <br />
          viewerId: {viewerId ?? "null"}  
          <br />
          is_private: {String(profile.is_private)}  
          <br />
          followers_count: {profile.followers_count}  
          <br />
          following_count: {profile.following_count}  
          <br />
          posts count: {postsRaw?.length ?? 0}
        </p>
      </div>

      {/* ⭐ If ProfileClient crashes, the diagnostic box above still shows */}
      <ProfileClient profile={profile} posts={postsRaw ?? []} />
    </div>
  );
}
