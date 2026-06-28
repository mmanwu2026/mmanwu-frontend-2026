"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";

interface VisionCommentsProps {
  postId: string;
}

export default function VisionComments({ postId }: VisionCommentsProps) {
  const supabase = useSupabase();
  const { user } = useUser();

  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rewriteSuggestion, setRewriteSuggestion] = useState<string | null>(
    null
  );

  async function runGatekeeper(rawText: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) {
        throw new Error("Gatekeeper request failed");
      }

      const data = await res.json();
      return data as {
        approved: boolean;
        suggestion?: string;
      };
    } catch (err: any) {
      console.error(err);
      return { approved: true };
    }
  }

  async function handleSubmit() {
    setError("");
    setRewriteSuggestion(null);

    if (!user) {
      setError("You must be logged in to comment.");
      return;
    }

    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }

    setLoading(true);

    // Gatekeeper check
    const gate = await runGatekeeper(content.trim());

    if (!gate.approved && gate.suggestion) {
      setRewriteSuggestion(gate.suggestion);
      setLoading(false);
      return;
    }

    const finalContent = gate.approved
      ? content.trim()
      : gate.suggestion ?? content.trim();

    const { error: dbError } = await supabase
      .from("vision_post_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: finalContent,
      });

    if (dbError) {
      console.error(dbError);
      setError("Failed to post comment.");
      setLoading(false);
      return;
    }

    setContent("");
    setLoading(false);
  }

  async function acceptRewrite() {
    if (!rewriteSuggestion) return;

    setLoading(true);
    setError("");

    if (!user) {
      setError("You must be logged in to comment.");
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("vision_post_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: rewriteSuggestion,
      });

    if (dbError) {
      console.error(dbError);
      setError("Failed to post rewritten comment.");
      setLoading(false);
      return;
    }

    setContent("");
    setRewriteSuggestion(null);
    setLoading(false);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <textarea
        className="w-full bg-gray-800 text-white rounded p-2 mb-3 text-sm"
        placeholder="Add a comment…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {rewriteSuggestion && (
        <div className="bg-gray-800 border border-yellow-500/40 rounded p-3 mb-3">
          <p className="text-yellow-300 text-sm mb-2">
            Gatekeeper suggests this rewrite:
          </p>
          <p className="text-gray-100 text-sm mb-3">{rewriteSuggestion}</p>

          <div className="flex gap-2">
            <button
              onClick={acceptRewrite}
              className="bg-purple-600 px-3 py-1 rounded text-sm hover:bg-purple-500"
            >
              Accept rewrite
            </button>
            <button
              onClick={() => setRewriteSuggestion(null)}
              className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Keep original
            </button>
          </div>
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
