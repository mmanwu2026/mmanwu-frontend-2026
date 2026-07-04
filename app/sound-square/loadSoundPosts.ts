import { createBrowserClient } from "@supabase/ssr";

export type ReactionCounts = {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
};

export type SoundComment = {
  id: string;
  content: string;
  raw_input: string | null;
  created_at: string;
  automask: number;
  positivity_ratio: number;
  user_id: string;
  profiles: { username: string | null; avatar_url: string | null };
};

export type CardSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  creator_name: string | null;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  automask: number;
  reactions: ReactionCounts;
  share_count: number;
  share_score: number;
  users: { username: string | null; avatar_url: string | null };
  comments: SoundComment[];
  comment_count: number;
};

export async function loadSoundPosts() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ⭐ Load posts + creator_name + profile fallback
  const { data: posts, error } = await supabase
    .from("sound_posts")
    .select(`
      id,
      title,
      audio_url,
      creator_id,
      creator_name,
      created_at,
      spirit_score,
      positivity_ratio,
      automask,
      users:creator_id ( username, avatar_url )
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

  // ⭐ Load shares — correct table
  const { data: shareRows, error: shareError } = await supabase
    .from("sound_post_shares")
    .select("post_id")
    .in("post_id", ids);

  const safeShareRows = shareError ? [] : shareRows ?? [];

  // ⭐ Load comments
  const { data: commentRows } = await supabase
    .from("sound_post_comments")
    .select(`
      id,
      post_id,
      content,
      raw_input,
      created_at,
      automask,
      positivity_ratio,
      user_id,
      profiles:user_id ( username, avatar_url )
    `)
    .in("post_id", ids)
    .order("created_at", { ascending: true });

  const enriched: CardSoundPost[] = posts.map((p: any) => {
    const userObj = Array.isArray(p.users) ? p.users[0] : p.users;

    // ⭐ Reaction aggregation
    const rows = (reactionRows ?? []).filter((r: any) => r.post_id === p.id);

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
    const spirit_score = rows.reduce((sum, r) => sum + r.maskTier, 0);
    const positivity_ratio = total > 0 ? positive / total : 0.5;

    let automask = 2;
    if (spirit_score > 20) automask = 3;
    if (spirit_score > 100) automask = 4;
    if (spirit_score > 300) automask = 5;
    if (spirit_score > 500) automask = 6;

    // ⭐ Share aggregation
    const share_count = safeShareRows.filter(
      (s: any) => s.post_id === p.id
    ).length;

    const share_score = share_count * 5;

    // ⭐ Comment aggregation
    const rawComments = (commentRows ?? []).filter(
      (c: any) => c.post_id === p.id
    );

    const comments: SoundComment[] = rawComments.map((c: any) => ({
      id: c.id,
      content: c.content,
      raw_input: c.raw_input,
      created_at: c.created_at,
      automask: c.automask,
      positivity_ratio: c.positivity_ratio,
      user_id: c.user_id,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
    }));

    const comment_count = comments.length;

    // ⭐ FINAL — correct creator name fallback
    const username =
      userObj?.username ??
      p.creator_name ??
      "Unknown";

    return {
      id: p.id,
      title: p.title,
      audio_url: p.audio_url,
      creator_id: p.creator_id,
      creator_name: p.creator_name,
      created_at: p.created_at,

      spirit_score,
      positivity_ratio,
      automask,

      reactions: counts,
      share_count,
      share_score,

      users: {
        username,
        avatar_url: userObj?.avatar_url ?? null,
      },

      comments,
      comment_count,
    };
  });

  return enriched;
}
