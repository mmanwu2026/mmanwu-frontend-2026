/* -------------------- SHARED TYPES (SAFE FOR CLIENT) -------------------- */

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
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
};

export type CardSoundPost = {
  id: string;
  title: string;

  // ⭐ FIXED
  audio_url: string | null;

  creator_id: string;
  creator_name: string | null;
  created_at: string;

  spirit_score: number;
  positivity_ratio: number;
  automask: number;

  privacy_type: "public" | "private";

  reactions: ReactionCounts;

  share_count: number;
  share_score: number;

  users: {
    username: string | null;
    avatar_url: string | null;
  };

  comments: SoundComment[];
  comment_count: number;

  /* ⭐ NEW — REQUIRED FOR PRIVACY ENFORCEMENT */
  creator_privacy_type?: string;
};
