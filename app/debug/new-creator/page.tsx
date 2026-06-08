"use client";

import { useState } from "react";

<<<<<<< HEAD
export default function NewCreatorPage() {
  const [creatorId, setCreatorId] = useState("");
  const [status, setStatus] = useState("");
  const [content, setContent] = useState("My first post as a new creator!");
  const [mask, setMask] = useState(3);

  const handleCreate = async () => {
    if (!creatorId.trim()) {
      setStatus("❌ Please enter a creatorId");
      return;
    }

    setStatus("⏳ Creating...");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mask,
          creatorId,
        }),
      });

      if (!res.ok) {
        setStatus("❌ Failed to create creator/post");
        return;
      }

      setStatus(`✅ Created! Open /profile2/${creatorId}`);
    } catch (err) {
      setStatus("❌ Network error");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">One‑Click New Creator</h1>

      <div className="space-y-4">
        <div>
          <label className="font-semibold">Creator ID</label>
          <input
            className="w-full p-2 border rounded"
            placeholder="creator-001"
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold">Post Content</label>
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold">Mask</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={mask}
            onChange={(e) => setMask(Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          Create Creator + Post
        </button>

        {status && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}


=======
export default function NewCreatorPage() {
  const [creatorId, setCreatorId] = useState("");
  const [status, setStatus] = useState("");
  const [content, setContent] = useState("My first post as a new creator!");
  const [mask, setMask] = useState(3);

  const handleCreate = async () => {
    if (!creatorId.trim()) {
      setStatus("❌ Please enter a creatorId");
      return;
    }

    setStatus("⏳ Creating...");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mask,
          creatorId,
        }),
      });

      if (!res.ok) {
        setStatus("❌ Failed to create creator/post");
        return;
      }

      setStatus(`✅ Created! Open /profile2/${creatorId}`);
    } catch (err) {
      setStatus("❌ Network error");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">One‑Click New Creator</h1>

      <div className="space-y-4">
        <div>
          <label className="font-semibold">Creator ID</label>
          <input
            className="w-full p-2 border rounded"
            placeholder="creator-001"
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold">Post Content</label>
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold">Mask</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={mask}
            onChange={(e) => setMask(Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          Create Creator + Post
        </button>

        {status && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

>>>>>>> 3da129198b47577ef02dc6a70f832e4d130a51dd