import { createBrowserClient } from "@supabase/ssr";

export type ReactionCounts = {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
};

export type CardSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;

  spirit_score: number;
  positivity_ratio: number;
  automask: number;

  reactions: ReactionCounts;

  share_count: number;        // ⭐ NEW
  share_score: number;        // ⭐ NEW (optional trending boost)

  users: {
    username: string | null;
    avatar_url: string | null;
  };
};

export async function loadSoundPosts() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts, error } = await supabase
    .from("sound_posts")
    .select(`
      id,
      title,
      audio_url,
      creator_id,
      created_at,
      users:creator_id (
        username,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !posts) {
    console.error("loadSoundPosts error:", error);
    return [];
  }

  const ids = posts.map((p) => p.id);

  // ⭐ Load reactions
  const { data: reactionRows } = await supabase
    .from("reactions")
    .select("post_id, maskTier")
    .in("post_id", ids)
    .eq("post_type", "sound");

  // ⭐ Load share analytics
  const { data: shareRows } = await supabase
    .from("sound_share")
    .select("post_id")
    .in("post_id", ids);

  const enriched: CardSoundPost[] = posts.map((p: any) => {
    const userObj = Array.isArray(p.users) ? p.users[0] : p.users;

    // ⭐ Reaction aggregation
    const rows = (reactionRows ?? []).filter(
      (r: any) => r.post_id === p.id
    );

    const counts: ReactionCounts = {
      mask1: rows.filter((r) => r.maskTier === 1).length,
      mask2: rows.filter((r) => r.maskTier === 2).length,
      mask3: rows.filter((r) => r.maskTier === 3).length,
      mask4: rows.filter((r) => r.maskTier === 4).length,
      mask5: rows.filter((r) => r.maskTier === 5).length,
      mask6: rows.filter((r) => r.maskTier === 6).length,
    };

    const total = rows.length;
    const positive = rows.filter((r) => r.maskTier >= 3).length;

    const spirit_score = rows.reduce(
      (sum, r) => sum + r.maskTier,
      0
    );

    const positivity_ratio =
      total > 0 ? positive / total : 0.5;

    let automask = 2;
    if (spirit_score > 20) automask = 3;
    if (spirit_score > 100) automask = 4;
    if (spirit_score > 300) automask = 5;
    if (spirit_score > 500) automask = 6;

    // ⭐ Share aggregation
    const share_count = (shareRows ?? []).filter(
      (s: any) => s.post_id === p.id
    ).length;

    // ⭐ Optional trending boost from shares
    const share_score = share_count * 5; // each share adds +5 to trending weight

    return {
      id: p.id,
      title: p.title,
      audio_url: p.audio_url,
      creator_id: p.creator_id,
      created_at: p.created_at,

      spirit_score,
      positivity_ratio,
      automask,

      reactions: counts,

      share_count,     // ⭐ NEW
      share_score,     // ⭐ NEW

      users: userObj,
    };
  });

  return enriched;
}
