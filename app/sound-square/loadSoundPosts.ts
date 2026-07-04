import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/* -------------------- RAW TYPES -------------------- */

type RawPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  creator_name: string | null;
  created_at: string;
  users: { username: string | null; avatar_url: string | null }[] | null;
};

type RawReaction = {
  post_id: string;
  maskTier: number;
};

type RawShare = {
  post_id: string;
};

type RawComment = {
  id: string;
  post_id: string;
  content: string;
  raw_input: string | null;
  created_at: string;
  automask: number;
  positivity_ratio: number;
  user_id: string;
  profiles: { username: string | null; avatar_url: string | null }[] | null;
};

/* -------------------- MAIN FUNCTION -------------------- */

export async function loadSoundPosts(): Promise<CardSoundPost[]> {
  const cookieStore = await cookies(); // ⭐ FIX — await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  /* -------------------- LOAD POSTS -------------------- */
  const { data: posts, error } = await supabase
    .from("sound_posts")
    .select(`
      id,
      title,
      audio_url,
      creator_id,
      creator_name,
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

  const ids = posts.map((p: RawPost) => p.id);

  /* -------------------- LOAD REACTIONS -------------------- */
  const { data: reactionRows } = await supabase
    .from("reactions")
    .select("post_id, maskTier")
    .in("post_id", ids)
    .eq("post_type", "sound");

  /* -------------------- LOAD SHARES -------------------- */
  const { data: shareRows, error: shareError } = await supabase
    .from("sound_post_shares")
    .select("post_id")
    .in("post_id", ids);

  const safeShareRows: RawShare[] = shareError ? [] : shareRows ?? [];

  /* -------------------- LOAD COMMENTS -------------------- */
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
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .in("post_id", ids)
    .order("created_at", { ascending: true });

  /* -------------------- ENRICH POSTS -------------------- */

  const enriched: CardSoundPost[] = posts.map((p: RawPost) => {
    const userObj =
      Array.isArray(p.users) && p.users.length > 0 ? p.users[0] : null;

    /* -------------------- REACTIONS -------------------- */
    const rows: RawReaction[] =
      (reactionRows ?? []).filter((r: RawReaction) => r.post_id === p.id);

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
      (sum: number, r: RawReaction) => sum + r.maskTier,
      0
    );

    const positivity_ratio = total > 0 ? positive / total : 0.5;

    let automask = 2;
    if (spirit_score > 20) automask = 3;
    if (spirit_score > 100) automask = 4;
    if (spirit_score > 300) automask = 5;
    if (spirit_score > 500) automask = 6;

    /* -------------------- SHARES -------------------- */
    const share_count = safeShareRows.filter(
      (s: RawShare) => s.post_id === p.id
    ).length;

    const share_score = share_count * 5;

    /* -------------------- COMMENTS -------------------- */
    const rawComments: RawComment[] =
      (commentRows ?? []).filter((c: RawComment) => c.post_id === p.id);

    const comments: SoundComment[] = rawComments.map((c: RawComment) => ({
      id: c.id,
      content: c.content,
      raw_input: c.raw_input,
      created_at: c.created_at,
      automask: c.automask,
      positivity_ratio: c.positivity_ratio,
      user_id: c.user_id,
      profiles:
        Array.isArray(c.profiles) && c.profiles.length > 0
          ? c.profiles[0]
          : { username: null, avatar_url: null },
    }));

    const comment_count = comments.length;

    /* -------------------- CREATOR NAME FALLBACK -------------------- */
    const username =
      userObj?.username ?? p.creator_name ?? "Unknown";

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
