"use client";

import React, { useState, useEffect } from "react";
import GatekeeperModal from "@/app/components/GatekeeperModal";
import SpiritToast from "@/app/components/SpiritToast";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter, usePathname } from "next/navigation";

interface Post {
  id: string;
  content: string;
  creator_id: string;
  mask: number;
  privacy_type: "public" | "private";
  gatekeeper_auto_approve: boolean | null;
  gatekeeper_rewrites: string[] | null;
}

interface RewriteOption {
  label: string;
  text: string;
  explanation: string;
}

export default function ComposerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase } = useSupabase();

  if (!pathname || !pathname.startsWith("/compose")) {
    return null;
  }

  const [uid, setUid] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [content, setContent] = useState("");
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

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

    // 2️⃣ Poll worker (up to 10 attempts)
    let updatedPost: Post | null = null;

    for (let i = 0; i < 10; i++) {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", insertedPost.id)
        .single();

      updatedPost = data as Post;

      if (updatedPost && updatedPost.gatekeeper_auto_approve !== null) {
        break;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    if (!updatedPost) return;

    // 3️⃣ Auto-approved → toast + redirect
    if (updatedPost.gatekeeper_auto_approve) {
      setToastMessage("The spirits approve your message ✨");
      setContent("");

      setTimeout(() => {
        router.replace("/plaza");
      }, 1800);

      return;
    }

    // 4️⃣ Harmful → rewrites
    if (updatedPost.gatekeeper_rewrites?.length) {
      const toneLabels = ["Calm", "Direct", "Elevated"];
      const toneExplanations = [
        "Softens the tone while keeping your message intact.",
        "Keeps your message firm and straightforward.",
        "Elevates the language for a more refined delivery.",
      ];

      const formatted = updatedPost.gatekeeper_rewrites.map((text, i) => ({
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

    supabase
      .from("posts")
      .insert({
        content: finalText,
        creator_id: uid!,
        mask: 0,
        privacy_type: privacyType,
      })
      .then(() => {
        setContent("");
        router.replace("/plaza");
      });
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

      <div className="min-h-screen w-full bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
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
            className="w-full h-full bg-gray-50 text-gray-900 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="px-4 pb-2">
          <select
            value={privacyType}
            onChange={(e) => setPrivacyType(e.target.value as "public" | "private")}
            className="w-full p-3 rounded-xl bg-gray-100 text-gray-900 border border-gray-300"
          >
            <option value="public">Public</option>
            <option value="private">Private (Followers Only)</option>
          </select>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loadingUser || !uid}
            className="w-full py-3 rounded-xl font-semibold bg-purple-600 text-white disabled:bg-purple-300 disabled:text-gray-100 hover:bg-purple-700 transition"
          >
            {loadingUser ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </>
  );
}
