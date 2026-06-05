"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MaskSelector from "@/components/MaskSelector";

export default function CreatePostPage() {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [mask, setMask] = useState(3);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitPost() {
    if (!content.trim()) {
      setMessage("Post content cannot be empty.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, mask }),
      });

      if (!res.ok) {
        setMessage("Failed to create post.");
        setLoading(false);
        return;
      }

      setMessage("Post created successfully!");

      setTimeout(() => {
        router.push("/plaza");
      }, 800);
    } catch (err) {
      setMessage("Network error — unable to reach backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Post</h1>

      <textarea
        className="w-full border p-3 rounded mb-4"
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your post here..."
      />

      <div className="mb-6">
        <MaskSelector value={mask} onChange={setMask} />
      </div>

      <button
        onClick={submitPost}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${
          loading ? "bg-gray-600" : "bg-black"
        }`}
      >
        {loading ? "Posting…" : "Submit"}
      </button>

      {message && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <p className="font-semibold">{message}</p>
        </div>
      )}
    </div>
  );
}
