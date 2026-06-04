"use client";

import { useState } from "react";

export default function CreatePostPage() {
  const [content, setContent] = useState("");

  const [response, setResponse] = useState("");

  async function submitPost() {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  content,
  mask: selectedMask
})


      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse("Network error — request blocked by browser.");
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Post</h1>

      <textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
/>


      <button
        onClick={submitPost}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Submit
      </button>

      {response && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Backend Response:</h2>
          <pre>{response}</pre>
        </div>
      )}
    </div>
  );
}
