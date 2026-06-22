import { SupabaseClient } from "@supabase/supabase-js";

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
  creator_name: string;
  created_at: string;
  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
  autoMask: number;
};

export async function loadSoundPosts(
  supabase: SupabaseClient
): Promise<CardSoundPost[]> {
  const { data: posts, error } = await supabase
    .from("sound_posts")
    .select("id, title, audio_url, creator_id, creator_name, created_at")
    .order("created_at", { ascending: false });

  if (error || !posts) {
    console.error("loadSoundPosts error:", error);
    return [];
  }

  const ids = posts.map((p) => p.id);

  const { data: reactions } = await supabase
    .from("reactions")
    .select("post_id, maskTier, value")
    .in("post_id", ids);

  return posts.map((post) => {
    const postReactions = (reactions ?? []).filter(
      (r) => r.post_id === post.id
    );

    const counts: ReactionCounts = {
      mask1: postReactions.filter((r) => r.maskTier === 1).length,
      mask2: postReactions.filter((r) => r.maskTier === 2).length,
      mask3: postReactions.filter((r) => r.maskTier === 3).length,
      mask4: postReactions.filter((r) => r.maskTier === 4).length,
      mask5: postReactions.filter((r) => r.maskTier === 5).length,
      mask6: postReactions.filter((r) => r.maskTier === 6).length,
    };

    const spiritScore = postReactions.reduce(
      (sum, r) => sum + (r.value ?? 0),
      0
    );

    const weightedPositive = postReactions
      .filter((r) => (r.value ?? 0) > 0)
      .reduce((sum, r) => sum + (r.value ?? 0), 0);

    const weightedTotal = Math.abs(spiritScore);
    const positivityRatio =
      weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

    const autoMask =
      spiritScore <= -10
        ? 1
        : spiritScore <= -3
        ? 2
        : spiritScore < 5
        ? 3
        : spiritScore < 15
        ? 4
        : spiritScore < 40
        ? 5
        : 6;

    return {
      id: post.id,
      title: post.title ?? "",
      audio_url: post.audio_url ?? "",
      creator_id: post.creator_id ?? "",
      creator_name: post.creator_name ?? "Unknown",
      created_at: post.created_at ?? "",
      reactions: counts,
      spiritScore,
      positivityRatio,
      autoMask,
    };
  });
}
