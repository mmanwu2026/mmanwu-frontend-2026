"use client";

import { useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/context/UserContext";

export default function SoundSquareUpload() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const dropRef = useRef<HTMLDivElement | null>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    validateFile(f);
  }

  function validateFile(f: File | null) {
    setError("");

    if (!f) return;

    const allowed = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
    if (!allowed.includes(f.type)) {
      setError("Unsupported audio format.");
      return;
    }

    if (f.size > 20 * 1024 * 1024) {
      setError("File too large. Max 20MB.");
      return;
    }

    setFile(f);
  }

  async function uploadWithProgress(file: File, path: string) {
    return new Promise<{ publicUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(
        "POST",
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sound-audio/${path}`
      );

      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      );

      xhr.upload.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status < 300) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound-audio/${path}`;
          resolve({ publicUrl });
        } else {
          reject(new Error(xhr.responseText));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    });
  }

  async function handleUpload() {
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!file) {
      setError("No file selected.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    const fileExt = file.name.split(".").pop();
    const filePath = `sounds/${crypto.randomUUID()}.${fileExt}`;

    let publicUrl: string;

    try {
      const result = await uploadWithProgress(file, filePath);
      publicUrl = result.publicUrl;
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      return;
    }

    const audio = document.createElement("audio");
    audio.src = publicUrl;

    await new Promise((resolve) => {
      audio.onloadedmetadata = resolve;
    });

    const duration = audio.duration;

    const { error: dbError } = await supabase.from("sound_posts").insert({
      title,
      audio_url: publicUrl,
      duration,
      creator_id: user.id,     // ⭐ NEW
      spirit_score: 0,         // ⭐ NEW
      mask: 2,                 // ⭐ NEW baseline mask
    });

    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    setSuccess(true);
    setUploading(false);
    setFile(null);
    setTitle("");
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Upload to SoundSquare</h1>

      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 rounded bg-gray-700 mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full h-32 border-2 border-dashed border-gray-500 rounded flex items-center justify-center mb-4 cursor-pointer"
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        {file ? (
          <p>{file.name}</p>
        ) : (
          <p className="text-gray-400">Drag & drop audio here or click to select</p>
        )}
      </div>

      <input
        id="fileInput"
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => validateFile(e.target.files?.[0] || null)}
      />

      {error && <p className="text-red-400 mb-2">{error}</p>}

      {uploading && (
        <div className="w-full bg-gray-700 rounded h-3 mb-4">
          <div
            className="bg-purple-500 h-3 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {success && (
        <p className="text-green-400 mb-4">Upload successful!</p>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
