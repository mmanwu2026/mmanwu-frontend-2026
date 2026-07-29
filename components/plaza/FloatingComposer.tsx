"use client";

import React, { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import GatekeeperModal, { GatekeeperOption } from "@/app/components/GatekeeperModal";
import SpiritToast from "@/app/components/SpiritToast";

interface ModerationResult {
  id: number;
  post_id: string;
  auto_approve: boolean | null;
  rewrites: string[] | null;
}

interface FloatingComposerProps {
  onPost: (post: any) => void;
}

export default function FloatingComposer({ onPost }: FloatingComposerProps) {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

  const [gatekeeperOptions, setGatekeeperOptions] = useState<GatekeeperOption[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Supabase session user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id ?? null;
      setUid(userId);
      setLoadingUser(false);
    }
    loadUser();
  }, [supabase]);

  async function handleSubmit(): Promise<void> {
    if (!content.trim() || loadingUser || !uid) return;

    // 1️⃣ Insert post
    const { data: insertedPost, error } = await supabase
      .from("posts")
      .insert({
        content,
        creator_id: uid,
        mask: 0,
        privacy_type: privacyType,
      })
      .select("*")
      .single();

    if (error || !insertedPost) {
      console.error("Post insert error:", error);
      return;
    }

    const postId = insertedPost.id;

    // 2️⃣ Poll moderation results
    let moderation: ModerationResult | null = null;

    for (let i = 0; i < 12; i++) {
      const { data } = await supabase
        .from("post_moderation")
        .select("*")
        .eq("post_id", postId)
        .single();

      moderation = data as ModerationResult;

      if (moderation && moderation.auto_approve !== null) break;

      await new Promise((r) => setTimeout(r, 300));
    }

    if (!moderation) return;

    // 3️⃣ Auto-approved → publish immediately
    if (moderation.auto_approve) {
      setToastMessage("The spirits approve your message ✨");
      setContent("");
      setExpanded(false);
      onPost(insertedPost);
      return;
    }

    // 4️⃣ Harmful → show rewrites
    if (moderation.rewrites?.length) {
      const toneLabels = ["Calm", "Direct", "Elevated"];
      const toneExplanations = [
        "Softens the tone while keeping your message intact.",
        "Keeps your message firm and straightforward.",
        "Elevates the language for a more refined delivery.",
      ];

      const formatted: GatekeeperOption[] = moderation.rewrites.map((text, i) => ({
        label: toneLabels[i],
        text,
        explanation: toneExplanations[i],
        postId,
      }));

      setGatekeeperOptions(formatted);
      setShowGatekeeper(true);
    }
  }

  async function handleGatekeeperSelect(option: GatekeeperOption): Promise<void> {
    setShowGatekeeper(false);

    // 5️⃣ Update original post with rewrite
    await supabase
      .from("posts")
      .update({ content: option.text })
      .eq("id", option.postId);

    setContent("");
    setExpanded(false);

    // Return updated post to parent
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", option.postId)
      .single();

    if (data) onPost(data);
  }

  return (
    <>
      {showGatekeeper && gatekeeperOptions && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={handleGatekeeperSelect}
          onClose={() => setShowGatekeeper(false)}
        />
      )}

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {!expanded && (
        <div
          className="w-full p-3 rounded-xl bg-purple-900/40 text-gray-300 cursor-pointer hover:bg-purple-800/40 transition-all"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center justify-between">
            <span>Write something…</span>
            <span className="text-xl">✍🏽</span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="absolute left-[180px] top-20 w-[360px] p-4 rounded-2xl bg-purple-900/40 backdrop-blur-xl shadow-xl z-[6000]">
          <textarea
            className="w-full rounded-xl p-3 resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 bg-purple-950/40"
            rows={5}
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <select
            value={privacyType}
            onChange={(e) => setPrivacyType(e.target.value as "public" | "private")}
            className="w-full mt-3 p-2 rounded-xl bg-purple-950/40 text-gray-300"
          >
            <option value="public">Public</option>
            <option value="private">Private (Followers Only)</option>
          </select>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loadingUser || !uid}
            className="w-full mt-3 py-2 rounded-xl font-semibold transition-all"
          >
            {loadingUser ? "Posting..." : "Post"}
          </button>

          <button
            className="text-sm text-gray-400 hover:text-gray-300 mt-2"
            onClick={() => setExpanded(false)}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
