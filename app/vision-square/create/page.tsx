"use client";

import { useState, useRef } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VisionSquareUpload() {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const dropRef = useRef<HTMLDivElement | null>(null);

  // ⭐ Vision Square limits
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
    return new Promise<{ publicUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(
        "POST",
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/vision_files/${path}`
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
    const filePath = `vision/${crypto.randomUUID()}.${fileExt}`;

    let publicUrl: string;

    try {
      const result = await uploadWithProgress(file, filePath);
      publicUrl = result.publicUrl;
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      return;
    }

    // ⭐ Insert into Vision table
    const { error: dbError } = await supabase.from("vision_posts").insert({
      title,
      media_url: publicUrl,
      creator_id: user.id,
      spirit_score: 0,
      positivity_ratio: 0.5,
      automask: 2, // ⭐ match SoundSquare + Plaza defaults
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

    router.push("/vision-square/feed");
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white">

      {/* Navigation */}
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

        {user && (
          <Link
            href={`/profile/${user.id}`}
            className="text-gray-300 hover:text-purple-300 transition font-medium"
          >
            Profile →
          </Link>
        )}
      </div>

      <h1 className="text-3xl font-bold mb-6">Upload to VisionSquare</h1>

      {/* Title */}
      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 rounded bg-gray-700 mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Drag & Drop */}
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
          <p className="text-gray-400">Drag & drop image/video here or click to select</p>
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
