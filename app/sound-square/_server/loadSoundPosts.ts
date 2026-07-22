import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/* -------------------- IMPORT SHARED TYPES -------------------- */
import type {
  ReactionCounts,
  SoundComment,
  CardSoundPost,
} from "@/app/sound-square/types";

/* -------------------- RAW TYPES (SERVER ONLY) -------------------- */
type RawPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;
  privacy_type: "public" | "private";
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
  const supabase = await createSupabaseServerClient();

  // Load auth user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const uid = session?.user?.id ?? null;

  // Load posts with privacy_type
  const { data: posts, error } = await supabase
    .from("sound_posts")
    .select(`
      id,
      title,
      audio_url,
      creator_id,
      created_at,
      privacy_type,
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

  // Load follow state
  let followMap: Record<string, boolean> = {};

  if (uid) {
    const creatorIds = posts.map((p: RawPost) => p.creator_id);

    const { data: followRows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", uid)
      .in("following_id", creatorIds);

    followRows?.forEach((row) => {
      followMap[row.following_id] = true;
    });
  }

  // Load reactions
  const { data: reactionRows } = await supabase
    .from("reactions")
    .select("post_id, maskTier")
    .in("post_id", ids)
    .eq("post_type", "sound");

  // Load shares
  const { data: shareRows, error: shareError } = await supabase
    .from("sound_post_shares")
    .select("post_id")
    .in("post_id", ids);

  const safeShareRows: RawShare[] = shareError ? [] : shareRows ?? [];

  // Load comments
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

  // Enrich posts with privacy enforcement
  const enriched: CardSoundPost[] = posts
    .map((p: RawPost) => {
      const isCreator = uid === p.creator_id;
      const isFollowing = followMap[p.creator_id] === true;

      const isAllowed =
        p.privacy_type === "public" ||
        isCreator ||
        isFollowing;

      if (!isAllowed) return null;

      const userObj = p.users?.[0] ?? { username: null, avatar_url: null };

      // Reactions
      const rows: RawReaction[] = (reactionRows ?? []).filter(
        (r: RawReaction) => r.post_id === p.id
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
        (sum: number, r: RawReaction) => sum + r.maskTier,
        0
      );
      const positivity_ratio = total > 0 ? positive / total : 0.5;

      let automask = 2;
      if (spirit_score > 20) automask = 3;
      if (spirit_score > 100) automask = 4;
      if (spirit_score > 300) automask = 5;
      if (spirit_score > 500) automask = 6;

      // Shares
      const share_count = safeShareRows.filter(
        (s: RawShare) => s.post_id === p.id
      ).length;

      const share_score = share_count * 5;

      // Comments
      const rawComments: RawComment[] = (commentRows ?? []).filter(
        (c: RawComment) => c.post_id === p.id
      );

      const comments: SoundComment[] = rawComments.map((c: RawComment) => {
        const profileObj = c.profiles?.[0] ?? {
          username: null,
          avatar_url: null,
        };

        return {
          id: c.id,
          content: c.content,
          raw_input: c.raw_input,
          created_at: c.created_at,
          automask: c.automask,
          positivity_ratio: c.positivity_ratio,
          user_id: c.user_id,
          profiles: profileObj,
        };
      });

      const comment_count = comments.length;

      const username = userObj.username ?? "Unknown";

      return {
        id: p.id,
        title: p.title,
        audio_url: p.audio_url,
        creator_id: p.creator_id,
        creator_name: null,
        created_at: p.created_at,
        spirit_score,
        positivity_ratio,
        automask,
        privacy_type: p.privacy_type,
        reactions: counts,
        share_count,
        share_score,
        users: {
          username,
          avatar_url: userObj.avatar_url,
        },
        comments,
        comment_count,
      };
    })
    .filter(Boolean) as CardSoundPost[];

  return enriched;
}
