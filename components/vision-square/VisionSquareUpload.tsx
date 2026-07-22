"use client";

import { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SpiritToast from "@/app/components/SpiritToast";

export default function VisionSquareUpload() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rewriteOptions, setRewriteOptions] = useState<string[]>([]);
  const [showRewriteModal, setShowRewriteModal] = useState(false);

  const dropRef = useRef<HTMLDivElement | null>(null);

  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    validateFile(f);
  }

  function validateFile(f: File | null) {
    setError("");

    if (!f) return;

    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError("Unsupported file type. Upload an image or video.");
      return;
    }

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setFile(f);
  }

  async function uploadWithProgress(file: File, path: string) {
    return new Promise<{ publicUrl: string }>(async (resolve, reject) => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        reject(new Error("Authentication error. Please log in again."));
        return;
      }

      const xhr = new XMLHttpRequest();

      xhr.open(
        "POST",
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/vision_files/${path}`
      );

      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status < 300) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vision_files/${path}`;
          resolve({ publicUrl });
        } else {
          reject(new Error(xhr.responseText));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    });
  }

  function extractTagsFromTitle(text: string): string[] {
    const matches = text.match(/#(\w+)/g);
    return matches ? matches.map((t) => t.replace("#", "").toLowerCase()) : [];
  }

  function parseHashtagInput(input: string): string[] {
    return input
      .split(/\s+/)
      .map((tag) => tag.replace("#", "").trim().toLowerCase())
      .filter((tag) => tag.length > 0);
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
      console.error("Gatekeeper fallback:", err);

      return {
        rewriteNeeded: false,
        autoApprove: true,
        finalText: text || "",
        automask: 2,
        positivityRatio: 0.5,
      };
    }
  }

  async function handleUpload() {
    if (!uid) {
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

    const gate = await runGatekeeper(title.trim());

    if (gate.rewriteNeeded) {
      setRewriteOptions(gate.rewrites || []);
      setShowRewriteModal(true);
      return;
    }

    await finalizeUpload(gate.finalText ?? title.trim(), gate.automask, gate.positivityRatio);
  }

  async function finalizeUpload(finalTitle: string, automask: number, positivity: number) {
    if (!uid) {
      setError("You must be logged in.");
      return;
    }

    if (!finalTitle.trim()) {
      setError("Title cannot be empty.");
      return;
    }

    const parsedTitleTags = extractTagsFromTitle(finalTitle);
    const parsedHashtags = parseHashtagInput(hashtags);
    const allTags = [...parsedTitleTags, ...parsedHashtags];

    setUploading(true);
    setProgress(0);
    setError("");

    const fileExt = file!.name?.split(".").pop() || "bin";
    const filePath = `${uid}/${crypto.randomUUID()}.${fileExt}`;

    let publicUrl: string;

    try {
      const result = await uploadWithProgress(file!, filePath);
      publicUrl = result.publicUrl;
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("vision_posts").insert({
      title: finalTitle,
      media_url: publicUrl,
      creator_id: uid,
      spirit_score: automask,
      positivity_ratio: positivity,
      automask,
      tags: allTags,
      privacy_type: privacyType,
    });

    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    if (positivity >= 0.6) {
      setToastMessage("The spirits approve your vision ✨");
    }

    setUploading(false);
    setFile(null);
    setTitle("");
    setHashtags("");

    router.refresh();
    router.push("/vision-square/feed");
  }

 return (
  <div className="max-w-xl mx-auto p-6 text-white">
    {toastMessage && (
      <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
    )}

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

    <div className="mb-6 flex justify-between items-center">
      <Link
        href="/vision-square/feed"
        className="text-gray-300 hover:text-purple-300 transition font-medium"
      >
        ← Back to VisionSquare
      </Link>

      <Link
        href="/plaza"
        className="text-gray-300 hover:text-purple-300 transition font-medium"
      >
        Plaza →
      </Link>

      {uid && (
        <Link
          href={`/profile/${uid}`}
          className="text-gray-300 hover:text-purple-300 transition font-medium"
        >
          Profile →
        </Link>
      )}
    </div>

    <h1 className="text-3xl font-bold mb-6">Upload to VisionSquare</h1>

    {/* ⭐ PRIVACY TOGGLE */}
    <div className="mb-4">
      <label className="block text-gray-300 mb-2 font-medium">
        Privacy
      </label>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setPrivacyType("public")}
          className={`
            px-4 py-2 rounded 
            ${privacyType === "public"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-300"}
          `}
        >
          Public
        </button>

        <button
          type="button"
          onClick={() => setPrivacyType("private")}
          className={`
            px-4 py-2 rounded 
            ${privacyType === "private"
              ? "bg-purple-600 text-white"
              : "bg-gray-700 text-gray-300"}
          `}
        >
          Private
        </button>
      </div>

      <p className="text-gray-400 text-sm mt-2">
        {privacyType === "public"
          ? "Everyone can see this Vision."
          : "Only your followers can see this Vision."}
      </p>
    </div>

    <input
      type="text"
      placeholder="Title"
      className="w-full p-2 rounded bg-gray-700 mb-4"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />

    <input
      type="text"
      placeholder="#lagos #dance #fashion"
      className="w-full p-2 rounded bg-gray-700 mb-4"
      value={hashtags}
      onChange={(e) => setHashtags(e.target.value)}
    />

    <div
      ref={dropRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full h-32 border-2 border-dashed border-gray-500 rounded flex items-center justify-center mb-4 cursor-pointer"
      onClick={() => document.getElementById("visionFileInput")?.click()}
    >
      {file ? (
        <p>{file.name}</p>
      ) : (
        <p className="text-gray-400">
          Drag & drop image/video here or click to select
        </p>
      )}
    </div>

    <input
      id="visionFileInput"
      type="file"
      accept="image/*,video/*"
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