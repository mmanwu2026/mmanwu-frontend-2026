// rebuild-frontend-006 — env variable + redirect to Plaza
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import MaskSelector from "@/components/MaskSelector";

// ⭐ Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function CreatePostPage() {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [mask, setMask] = useState(3);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPost() {
    if (!content.trim()) {
      setResponse("Post cannot be empty.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mask }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));

      // ⭐ Redirect to Plaza after successful post
      router.push("/plaza");

      // Reset form (optional)
      setContent("");
      setMask(3);
    } catch (err) {
      setResponse("Network error — request blocked by browser.");
    }

    setLoading(false);
  }

  return (
    <div className="isolate-layout p-10 max-w-xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">Create Post</h1>

      <textarea
        className="w-full border border-gray-700 bg-black p-3 rounded mb-4"
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your post here..."
      />

      <div className="mb-6">
        <label className="font-semibold text-sm">Choose Your Mask</label>
        <MaskSelector selectedMask={mask} onSelect={setMask} />
      </div>

      <button
        onClick={submitPost}
        disabled={loading}
        className="bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200 transition"
      >
        {loading ? "Posting..." : "Submit"}
      </button>

      {response && (
        <div className="mt-6 p-4 border border-gray-700 rounded bg-gray-900">
          <h2 className="font-semibold mb-2">Backend Response:</h2>
          <pre className="text-xs">{response}</pre>
        </div>
      )}
    </div>
  );
}
