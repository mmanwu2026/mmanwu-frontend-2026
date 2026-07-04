"use client";

import { useState, useRef } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import SpiritToast from "@/components/SpiritToast";
import Link from "next/link";

export default function SoundSquareUpload() {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [rewriteOptions, setRewriteOptions] = useState<string[]>([]);
  const [showRewriteModal, setShowRewriteModal] = useState(false);

  const dropRef = useRef<HTMLDivElement | null>(null);

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const ALLOWED_MIME_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
  ];

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    validateFile(f);
  }

  function validateFile(f: File | null) {
    setError("");

    if (!f) return;

    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError("Unsupported audio format. Allowed: MP3, WAV, OGG, FLAC.");
      return;
    }

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setFile(f);
  }

  // ⭐ CORRECTED — Supabase official upload API with proper MIME type
  async function uploadSound(file: File, path: string) {
    const mime =
      file.type ||
      (file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "application/octet-stream");

    const { data, error } = await supabase.storage
      .from("sound_files")
      .upload(path, file, {
        contentType: mime,
        upsert: true,
      });

    if (error) throw error;

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/${path}`;
  }

  async function runGatekeeper(text: string) {
    try {
      const res = await fetch("/api/gatekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Gatekeeper failed");

      return await res.json();
    } catch (err) {
      console.error(err);
      return {
        rewriteNeeded: false,
        autoApprove: true,
        content: text,
        automask: 3,
        positivityRatio: 0.5,
      };
    }
  }

  async function handleUpload() {
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!file) {
      setError("No audio selected.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    const gate = await runGatekeeper(title.trim());

    if (gate.rewriteNeeded) {
      setRewriteOptions(gate.rewrites || []);
      setShowRewriteModal(true);
      return;
    }

    await finalizeUpload(gate.finalText, gate.automask, gate.positivityRatio);
  }

  async function finalizeUpload(finalTitle: string, automask: number, positivity: number) {
    setUploading(true);
    setProgress(0);
    setError("");

    const fileExt = file!.name.split(".").pop();
    const filePath = `${user!.id}/${crypto.randomUUID()}.${fileExt}`;

    let publicUrl: string;

    try {
      publicUrl = await uploadSound(file!, filePath);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("sound_posts").insert({
      title: finalTitle,
      audio_url: publicUrl,
      creator_id: user!.id,
      spirit_score: 0,
      positivity_ratio: 0.5,
      automask,
      post_type: "sound",
    });

    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    if (positivity >= 0.6) {
      setToastMessage("The spirits approve your sound ✨");
    }

    setUploading(false);
    setFile(null);
    setTitle("");

    router.refresh();
    router.push("/sound-square/feed");
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white">
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Rewrite Modal */}
      {showRewriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Rewrite Suggested</h2>
            <p className="text-gray-300 mb-4">
              The spirits suggest a more uplifting version of your title:
            </p>

            {rewriteOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  setShowRewriteModal(false);
                  finalizeUpload(opt, 4, 0.8);
                }}
                className="block w-full text-left bg-gray-700 hover:bg-gray-600 p-3 rounded mb-2"
              >
                {opt}
              </button>
            ))}

            <button
              onClick={() => setShowRewriteModal(false)}
              className="mt-4 text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link
          href="/sound-square/feed"
          className="text-gray-300 hover:text-purple-300 transition font-medium"
        >
          ← Back to SoundSquare
        </Link>
      </div>

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
