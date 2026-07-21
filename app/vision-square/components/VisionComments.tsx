"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import SpiritToast from "@/app/components/SpiritToast";
import { useRouter } from "next/navigation";

interface VisionCommentsProps {
  postId: string;
}

export default function VisionComments({ postId }: VisionCommentsProps) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // ⭐ FIXED — authenticated user
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setEmail(user?.email || null);
    }
    loadUser();
  }, [supabase]);

  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [gateData, setGateData] = useState<any | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

/* ---------------- LOAD CREATOR ID (SAFE) ---------------- */
useEffect(() => {
  async function loadCreator() {
    const { data: rows } = await supabase
      .from("vision_posts")
      .select("creator_id")
      .eq("id", postId)
      .limit(1);

    const row = rows?.[0] ?? null;

    if (row?.creator_id) {
      setCreatorId(row.creator_id);
    }
  }

  loadCreator();
}, [postId, supabase]);

  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) throw new Error("Gatekeeper request failed");
      return await res.json();
    } catch (err) {
      console.error("Gatekeeper fallback:", err);

      return {
        rewriteNeeded: false,
        autoApprove: true,
        finalText: rawText,
        automask: 2,
        positivityRatio: 0.5,
      };
    }
  }

 /* ---------------- INSERT COMMENT ---------------- */
async function insertComment(
  finalText: string,
  automask: number,
  positivity: number
) {
  if (!uid) {
    setError("You must be logged in.");
    return false;
  }

  // 1. Save comment
  const { error: dbError } = await supabase
    .from("vision_post_comments")
    .insert({
      post_id: postId,
      user_id: uid,
      content: finalText,
      raw_input: content,
      automask,
      positivity_ratio: positivity,
    });

  if (dbError) {
    console.error(dbError);
    setError("Failed to post comment.");
    return false;
  }

  // 2. Fetch creator's push subscription (SAFE)
  const { data: rows } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", uid)
    .limit(1);

  const sub = rows?.[0] ?? null;

    // ⭐ Insert notification into database (vision comment)
    await fetch("/functions/v1/create-notification", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipientId: creatorId,
    actorId: uid,
    postId,
    postType: "vision",
    message: `${email || "Someone"} commented on your vision`,
    eventType: "comment",
  }),
});

    // 3. Trigger push notification
    if (sub?.subscription) {
      await fetch(
        "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.subscription,
            payload: {
              title: "New Comment 👁️",
              body: `${email || "Someone"} commented on your vision`,
              icon: "/icons/mman-192.png",
              url: `/vision/${postId}`,
            },
          }),
        }
      );
    }

    router.refresh();
    return true;
  }

  async function handleSubmit() {
    setError("");

    if (!uid) {
      setError("You must be logged in to comment.");
      return;
    }

    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }

    setLoading(true);

    const gate = await runGatekeeper(content.trim());

    if (gate.autoApprove && !gate.rewriteNeeded) {
      const ok = await insertComment(
        gate.finalText,
        gate.automask,
        gate.positivityRatio
      );

      if (ok) {
        if (gate.positivityRatio >= 0.6 || gate.automask >= 3) {
          setToastMessage("Your words uplift the spirits ✨");
        }
        setContent("");
      }

      setLoading(false);
      return;
    }

    if (gate.rewriteNeeded) {
      setGateData(gate);
      setShowGateModal(true);
      setLoading(false);
      return;
    }

    const ok = await insertComment(
      gate.finalText,
      gate.automask,
      gate.positivityRatio
    );

    if (ok) setContent("");

    setLoading(false);
  }

  async function acceptRewrite(rewrite: string) {
    setLoading(true);

    const ok = await insertComment(
      rewrite,
      gateData.automask,
      gateData.positivityRatio
    );

    if (ok) {
      if (gateData.positivityRatio >= 0.6 || gateData.automask >= 3) {
        setToastMessage("Your words uplift the spirits ✨");
      }

      setContent("");
      setGateData(null);
      setShowGateModal(false);
    }

    setLoading(false);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <textarea
        className="w-full bg-gray-800 text-white rounded p-2 mb-3 text-sm"
        placeholder="Add a comment…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {showGateModal && gateData && (
        <div className="bg-gray-800 border border-yellow-500/40 rounded p-3 mb-3 animate-[fadeIn_0.3s_ease-out_forwards] opacity-0">
          <p className="text-yellow-300 text-sm mb-2">
            The spirits suggest a more uplifting version:
          </p>

          {gateData.rewrites.map((r: string, idx: number) => (
            <button
              key={idx}
              onClick={() => acceptRewrite(r)}
              className="block w-full text-left p-3 mb-2 bg-neutral-700 rounded hover:bg-neutral-600"
            >
              {r}
            </button>
          ))}

          <button
            onClick={() => setShowGateModal(false)}
            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
          >
            Keep original
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-purple-600 px-4 py-2 rounded text-sm hover:bg-purple-500 disabled:opacity-50"
      >
        {loading ? "Posting…" : "Post comment"}
      </button>
    </div>
  );
}
