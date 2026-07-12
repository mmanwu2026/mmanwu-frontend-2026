"use client";

import React, { useState, useEffect } from "react";
import GatekeeperModal from "@/components/GatekeeperModal";
import SpiritToast from "@/components/SpiritToast";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

interface GatekeeperResponse {
  autoApprove?: boolean;
  rewrites?: string[];
}

interface RewriteOption {
  label: string;
  text: string;
  explanation: string;
}

export default function ComposerPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [content, setContent] = useState("");

  const [gatekeeperOptions, setGatekeeperOptions] = useState<RewriteOption[] | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id ?? null;
      setUid(userId);
      setLoadingUser(false);
    }
    loadUser();
  }, [supabase]);

  async function runGatekeeper(rawText: string): Promise<GatekeeperResponse | null> {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) return null;
      return (await res.json()) as GatekeeperResponse;
    } catch {
      return null;
    }
  }

  async function publishToSupabase(finalText: string): Promise<void> {
    if (!uid) return;

    const { data, error } = await supabase
      .from("posts")
      .insert({
        content: finalText,
        creator_id: uid,
        mask: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Post insert error:", error);
      return;
    }

    router.replace("/plaza");
  }

  async function handleSubmit(): Promise<void> {
    if (!content.trim() || loadingUser || !uid) return;

    const result = await runGatekeeper(content);

    if (result?.autoApprove) {
      await publishToSupabase(content);
      setToastMessage("The spirits approve your message ✨");
      setContent("");
      return;
    }

    if (result?.rewrites) {
      const toneLabels = ["Calm", "Direct", "Elevated"];
      const toneExplanations = [
        "Softens the tone while keeping your message intact.",
        "Keeps your message firm and straightforward.",
        "Elevates the language for a more refined delivery.",
      ];

      const formatted: RewriteOption[] = result.rewrites.map((text, i) => ({
        label: toneLabels[i],
        text,
        explanation: toneExplanations[i],
      }));

      setGatekeeperOptions(formatted);
      setShowGatekeeper(true);
    }
  }

  function handleGatekeeperSelect(finalText: string): void {
    setShowGatekeeper(false);
    publishToSupabase(finalText);
    setContent("");
  }

  return (
    <>
      {/* ⭐ Gatekeeper Modal via portal */}
      {showGatekeeper && gatekeeperOptions && (
        <GatekeeperModal
          options={gatekeeperOptions}
          onSelect={handleGatekeeperSelect}
          onClose={() => setShowGatekeeper(false)}
        />
      )}

      {/* ⭐ Spirit Toast */}
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* ⭐ Full Page Composer */}
      <div
        className="
          min-h-screen w-full bg-white flex flex-col
          pt-[env(safe-area-inset-top)]
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Create Post</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-500 text-xl px-2 py-1 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-4">
          <textarea
            className="
              w-full h-full
              bg-gray-50 text-gray-900
              rounded-xl p-4
              resize-none
              focus:outline-none focus:ring-2 focus:ring-purple-500
            "
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loadingUser || !uid}
            className="
              w-full py-3 rounded-xl font-semibold
              bg-purple-600 text-white
              disabled:bg-purple-300 disabled:text-gray-100
              hover:bg-purple-700 transition
            "
          >
            {loadingUser ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </>
  );
}
