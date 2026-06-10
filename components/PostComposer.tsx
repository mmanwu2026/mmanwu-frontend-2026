"use client";

import React, { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function PostComposer({ onPostCreated }: { onPostCreated: () => void }) {
  const [content, setContent] = useState("");
  const [maskTier, setMaskTier] = useState(3); // default: 😊
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitPost() {
    if (!content.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          creatorId: "viewer-demo-001",
          content,
          mask: maskTier,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      setContent("");
      setMaskTier(3);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || "Error creating post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl bg-white border rounded-2xl shadow p-6 mb-10">
      <h2 className="text-xl font-bold text-black mb-4 text-center">
        Create a Post
      </h2>

      {/* Mask Selector */}
      <div className="flex justify-center gap-4 mb-4">
        {[1, 2, 3, 4, 5].map((tier) => (
          <button
            key={tier}
            onClick={() => setMaskTier(tier)}
            className={`
              text-3xl transition-transform
              ${maskTier === tier ? "scale-125" : "opacity-50 hover:opacity-100"}
            `}
          >
            {tier === 1 && "😶‍🌫️"}
            {tier === 2 && "😤"}
            {tier === 3 && "😊"}
            {tier === 4 && "🤩"}
            {tier === 5 && "😇"}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts with the Plaza..."
        className="w-full h-32 p-3 border rounded-lg text-black bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* Submit Button */}
      <button
        onClick={submitPost}
        disabled={loading}
        className={`
          w-full mt-4 py-3 rounded-lg font-semibold text-white
          ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}
          transition-colors
        `}
      >
        {loading ? "Posting..." : "Post to Plaza"}
      </button>
    </div>
  );
}
