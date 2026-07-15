export async function getFollowedUsers(supabase, userId: string) {
  // Step A — get the list of user IDs you follow
  const { data: following, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (followError) {
    console.error("Error loading follow list:", followError);
    return [];
  }

  const ids = following?.map(f => f.following_id) ?? [];

  if (ids.length === 0) {
    return []; // You follow no one yet
  }

  // Step B — fetch profiles for those users
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", ids);

  if (profileError) {
    console.error("Error loading followed profiles:", profileError);
    return [];
  }

  return profiles;
}
