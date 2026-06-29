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

  users: {
    username: string | null;
    avatar_url: string | null;
  };
};

export async function loadSoundPosts() {
  // ⭐ Browser Supabase client — SAFE for client components
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

  const { data: reactionRows } = await supabase
    .from("reactions")
    .select("post_id, maskTier")
    .in("post_id", ids)
    .eq("post_type", "sound");

  const enriched: CardSoundPost[] = posts.map((p: any) => {
    const userObj = Array.isArray(p.users) ? p.users[0] : p.users;

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

      users: userObj,
    };
  });

  return enriched;
}
