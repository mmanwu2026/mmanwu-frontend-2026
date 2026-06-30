import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

// Plaza AI Gatekeeper — Toxicity / Hostility / Profanity / Negativity
function evaluateSpirit(content: string) {
  const lowered = content.toLowerCase();

  const toxicWords = [
    "hate", "stupid", "idiot", "dumb", "trash", "kill",
    "fuck", "shit", "bitch", "asshole", "ugly", "disgusting",
    "loser", "terrible", "awful", "horrible"
  ];

  const negativityPatterns = [
    "you should",
    "why would you",
    "this is bad",
    "you failed",
    "nobody cares",
    "stop posting",
    "you're wrong"
  ];

  const containsToxicity = toxicWords.some(w => lowered.includes(w));
  const containsNegativity = negativityPatterns.some(p => lowered.includes(p));

  if (containsToxicity || containsNegativity) {
    return {
      allowed: false,
      message: "Spirit Toast: Rewrite your comment to uplift the masquerade."
    };
  }

  return {
    allowed: true,
    message: "Your comment has been blessed by the Gatekeeper."
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { postId, content, userId } = req.body;

  if (!postId || !content || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Run Plaza AI Gatekeeper
  const spirit = evaluateSpirit(content);

  if (!spirit.allowed) {
    return res.status(200).json({
      approved: false,
      toast: spirit.message
    });
  }

  // Insert approved comment
  const { error } = await supabase
    .from("plaza_post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim()
    });

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to insert comment" });
  }

  return res.status(200).json({
    approved: true,
    toast: spirit.message
  });
}
