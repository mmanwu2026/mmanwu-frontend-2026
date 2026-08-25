"use client";

import React, { useState, useEffect, useRef } from "react";
import GatekeeperModal, { GatekeeperOption } from "@/app/components/GatekeeperModal";
import SpiritToast from "@/app/components/SpiritToast";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter, usePathname } from "next/navigation";

interface ModerationResult {
  id: number;
  post_id: string;
  auto_approve: boolean | null;
  rewrites: string[] | null;
}

export default function ComposerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase } = useSupabase();

  if (!pathname || !pathname.startsWith("/compose")) return null;

  const [uid, setUid] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [content, setContent] = useState("");
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

  const [gatekeeperOptions, setGatekeeperOptions] = useState<GatekeeperOption[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cancelPollingRef = useRef(false);

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

    cancelPollingRef.current = false;

    // ⭐ Insert raw post first (OPTION B)
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

    // ⭐ Poll moderation
    let moderation: ModerationResult | null = null;

    for (let i = 0; i < 12; i++) {
      if (cancelPollingRef.current) return;

      const { data } = await supabase
        .from("post_moderation")
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();

      moderation = data as ModerationResult;

      if (moderation && moderation.auto_approve !== null) {
        cancelPollingRef.current = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    if (!moderation) return;

    // ⭐ Auto-approved → raw post stays
    if (moderation.auto_approve) {
      setToastMessage("The spirits approve your message ✨");
      setContent("");

      setTimeout(() => {
        router.replace("/plaza");
      }, 1800);

      return;
    }

    // ⭐ Harmful → show rewrites
    if (moderation.rewrites?.length) {
      cancelPollingRef.current = true;

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

  // ⭐ Rewrite accepted → update existing post
  async function handleGatekeeperSelect(option: GatekeeperOption): Promise<void> {
    cancelPollingRef.current = true;
    setShowGatekeeper(false);

    await supabase
      .from("posts")
      .update({ content: option.text })
      .eq("id", option.postId);

    setContent("");
    router.replace("/plaza");
  }

  // ⭐ Rewrite rejected → delete raw post
  async function handleGatekeeperCancel(postId: string) {
    cancelPollingRef.current = true;

    await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    setShowGatekeeper(false);
    setContent("");
    router.back();
  }

  return (
    <>
      {showGatekeeper && gatekeeperOptions && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={handleGatekeeperSelect}
          onCancel={handleGatekeeperCancel}
        />
      )}

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* UI unchanged */}
      <div className="min-h-screen w-full bg-white flex flex-col pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <button
            onClick={() => router.back()}
            className="text-gray-500 text-xl px-2 py-1 hover:text-gray-700"
          >
            ✕
          </button>

          <select
            value={privacyType}
            onChange={(e) => setPrivacyType(e.target.value as "public" | "private")}
            className="p-2 rounded-lg bg-gray-100 text-gray-900 border border-gray-300 text-sm"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loadingUser || !uid}
            className="px-4 py-2 rounded-xl font-semibold bg-purple-600 text-white disabled:bg-purple-300 disabled:text-gray-100 hover:bg-purple-700 transition"
          >
            Post
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            className="w-full min-h-[40vh] max-h-[70vh] bg-gray-50 text-gray-900 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
