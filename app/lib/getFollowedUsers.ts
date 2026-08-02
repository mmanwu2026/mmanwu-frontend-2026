export async function getFollowedUsers(supabase: any, userId: string) {
  // ⭐ Safety: prevent silent failures
  if (!userId) {
    console.warn("getFollowedUsers called with null or undefined userId");
    return [];
  }

  // ⭐ PWA FIX — refresh session before any DB calls
  try {
    await supabase.auth.refreshSession();
  } catch (err) {
    console.error("Session refresh failed in getFollowedUsers:", err);
    // We continue anyway — profiles query may still succeed
  }

  // ⭐ Step A — get the list of user IDs you follow
  const { data: following, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (followError) {
    console.error("Error loading follow list:", followError);
    return [];
  }

  const ids = following?.map((f) => f.following_id) ?? [];

  if (ids.length === 0) {
    return []; // You follow no one yet
  }

  // ⭐ Step B — fetch profiles for those users
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids)
    .order("display_name", { ascending: true }); // ⭐ stable ordering

  if (profileError) {
    console.error("Error loading followed profiles:", profileError);
    return [];
  }

  return profiles ?? [];
}
