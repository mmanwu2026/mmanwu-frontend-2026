// vercel rebuild 006
"use client";

import { useState } from "react";

export default function NewCreatorPage() {
  const [creatorId, setCreatorId] = useState("");
  const [status, setStatus] = useState("");
  const [content, setContent] = useState("");
  const [mask, setMask] = useState("");

  const handleCreate = async () => {
    if (!creatorId.trim()) {
      setStatus("❌ Please enter a creator ID");
      return;
    }

    setStatus("⏳ Creating...");

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mask,
          creatorId,
        }),
      });

      if (!res.ok) {
        setStatus("❌ Failed to create");
        return;
      }

      setStatus("✅ Created! Open the new creator page.");
    } catch (error) {
      setStatus("❌ Error creating creator");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>New Creator Debug Page</h1>

      <div style={{ marginTop: "1rem" }}>
        <label>Creator ID:</label>
        <input
          type="text"
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          style={{ display: "block", marginTop: "0.5rem" }}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>Content:</label>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ display: "block", marginTop: "0.5rem" }}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>Mask:</label>
        <input
          type="text"
          value={mask}
          onChange={(e) => setMask(e.target.value)}
          style={{ display: "block", marginTop: "0.5rem" }}
        />
      </div>

      <button
        onClick={handleCreate}
        style={{ marginTop: "1.5rem", padding: "0.5rem 1rem" }}
      >
        Create
      </button>

      {status && (
        <p style={{ marginTop: "1rem", fontWeight: "bold" }}>{status}</p>
      )}
    </div>
  );
}
