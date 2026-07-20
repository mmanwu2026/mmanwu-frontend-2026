// ⭐ Server Component — DO NOT add "use client"
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileClient from "@/app/components/ProfileClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Viewer identity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;

  // Fetch profile
  const { data: profileRaw } = await supabase
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
      followers_count,
      following_count,
      location,
      website_url,
      verified,
      privacy_type
    `)
    .eq("id", id)
    .single();

  // Profile not found
  if (!profileRaw) {
    return (
      <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
        <div className="mt-6 text-lg font-semibold">Profile not found</div>
      </div>
    );
  }

  // Privacy enforcement
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

  // Fetch posts
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

  // ⭐ FIX: Add is_private so ProfileClient type is satisfied
  const profile = {
    ...profileRaw,
    is_private: profileRaw.privacy_type === "private",
    posts: [],
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
      {/* ⭐ AuthNav is global — do NOT import it here */}
      <ProfileClient profile={profile} posts={posts} />
    </div>
  );
}
