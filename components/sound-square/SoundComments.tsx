"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useSupabase } from "@/app/context/SupabaseContext";
import SpiritToast from "@/app/components/SpiritToast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SoundComments({
  postId,
  onSubmittedAction,
}: {
  postId: string;
  onSubmittedAction: () => void;
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // Auth
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

  const [text, setText] = useState("");
  const [gateData, setGateData] = useState<any>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  // Load creator + privacy_type
  useEffect(() => {
    async function loadCreator() {
      const { data: rows } = await supabase
        .from("sound_posts")
        .select("creator_id, privacy_type")
        .eq("id", postId)
        .limit(1);

      const row = rows?.[0] ?? null;

      if (row?.creator_id) setCreatorId(row.creator_id);
      if (row?.privacy_type) setPrivacyType(row.privacy_type);
    }

    loadCreator();
  }, [postId, supabase]);

  // Load follow-state
  useEffect(() => {
    async function loadFollowState() {
      if (!uid || !creatorId) return;

      const { data: rows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", creatorId)
        .limit(1);

      setIsFollowing(!!rows?.[0]);
    }

    loadFollowState();
  }, [uid, creatorId, supabase]);

  // Privacy enforcement
  const isCreator = uid === creatorId;
  const isAllowed =
    privacyType === "public" ||
    isCreator ||
    isFollowing === true;

  if (!isAllowed) {
    return (
      <div className="mt-10 bg-neutral-900/40 p-4 rounded-lg border border-white/10">
        <p className="text-gray-500 text-sm">
          Comments are private for this sound.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!text.trim()) return;

    setBusy(true);

    const res = await fetch("/api/gatekeeper", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    const gate = await res.json();

    if (gate.autoApprove && !gate.rewriteNeeded) {
      await submitFinal(gate.finalText, gate.automask, gate.positivityRatio);
      setToastMessage("The spirits approve your message ✨");
      return;
    }

    if (gate.rewriteNeeded) {
      setGateData(gate);
      setShowGateModal(true);
      setBusy(false);
      return;
    }

    await submitFinal(gate.finalText, gate.automask, gate.positivityRatio);
  }

  async function submitFinal(
    finalText: string,
    automask: number,
    positivityRatio: number
  ) {
    if (!uid) return;

    // Save comment
    await fetch("/api/sound-comments", {
      method: "POST",
      body: JSON.stringify({
        post_id: postId,
        raw_input: text,
        content: finalText,
        automask,
        positivity_ratio: positivityRatio,
      }),
    });

    // Fetch push subscription
    const { data: rows } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", uid)
      .limit(1);

    const sub = rows?.[0] ?? null;

    // Insert notification
    await fetch("/functions/v1/create-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: creatorId,
        actorId: uid,
        postId,
        postType: "sound",
        message: `${email || "Someone"} commented on your sound`,
        eventType: "comment",
      }),
    });

    // Push notification
    if (sub?.subscription) {
      await fetch(
        "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.subscription,
            payload: {
              title: "New Comment 🔊",
              body: `${email || "Someone"} commented on your sound`,
              icon: "/icons/mman-192.png",
              url: `/sound/${postId}`,
            },
          }),
        }
      );
    }

    // Reset UI
    setText("");
    setShowGateModal(false);
    setGateData(null);
    setBusy(false);

    router.refresh();
    onSubmittedAction();
  }

  return (
    <div className="mt-10 bg-neutral-900/40 p-4 rounded-lg border border-white/10">

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment…"
        className="w-full p-3 rounded bg-neutral-900 text-white border border-white/10"
      />

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-3 px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-500 disabled:opacity-50"
      >
        {busy ? "Posting…" : "Comment"}
      </button>

      {showGateModal && gateData && (
        <Modal onClose={() => setShowGateModal(false)}>
          <div className="p-4 text-white">
            <h2 className="text-lg font-semibold mb-3">Rewrite Required</h2>

            <p className="text-yellow-300 text-sm mb-2">
              The spirits suggest a more uplifting version:
            </p>

            {gateData.rewrites.map((r: string, idx: number) => (
              <button
                key={idx}
                onClick={() => submitFinal(r, gateData.automask, gateData.positivityRatio)}
                className="block w-full text-left p-3 mb-2 bg-neutral-800 rounded hover:bg-neutral-700"
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
        </Modal>
      )}
    </div>
  );
}
