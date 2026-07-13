"use client";

import { useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import SpiritToast from "@/app/components/SpiritToast";

export default function FloatingComposerVision() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  function extractTags(text: string): string[] {
    const matches = text.match(/#(\w+)/g);
    return matches ? matches.map((t) => t.replace("#", "").toLowerCase()) : [];
  }

  function validateFile(f: File | null) {
    setError("");

    if (!f) return;

    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError("Unsupported file type. Upload an image or video.");
      return;
    }

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
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
        finalText: text,
        automask: 3,
        positivityRatio: 0.5,
      };
    }
  }

  async function handleSubmit() {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;

    if (!uid) {
      setError("You must be logged in.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!file) {
      setError("Please select an image or video.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    const tags = extractTags(title);

    const gate = await runGatekeeper(title.trim());

    if (gate.autoApprove && !gate.rewriteNeeded) {
      setToastMessage("The spirits approve your vision ✨");
    }

    const finalTitle = gate.finalText;
    const automask = gate.automask;
    const positivity = gate.positivityRatio;

    const spirit = automask;

    const fileExt = file.name?.split(".").pop() || "bin";
    const filePath = `${uid}/${crypto.randomUUID()}.${fileExt}`;

    let publicUrl: string;

    try {
      const result = await uploadWithProgress(file, filePath);
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
      spirit_score: spirit,
      positivity_ratio: positivity,
      automask,
      tags,
    });

    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    setTitle("");
    setFile(null);

    router.refresh();
    router.push("/vision-square/feed");
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 transition-all ${
        open ? "h-48" : "h-12"
      }`}
    >
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <div
        className="w-full text-center py-2 cursor-pointer text-gray-300 hover:text-purple-300"
        onClick={() => setOpen(!open)}
      >
        {open ? "▼ Hide Composer" : "▲ Show Composer"}
      </div>

      {open && (
        <div className="px-4 pb-4">

          <input
            type="text"
            placeholder="Title"
            className="w-full p-2 rounded bg-gray-700 mb-3 text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="file"
            accept="image/*,video/*"
            className="w-full mb-3 text-gray-300"
            onChange={(e) => validateFile(e.target.files?.[0] || null)}
          />

          {file && (
            <p className="text-gray-400 mb-2">Selected: {file.name}</p>
          )}

          {error && <p className="text-red-400 mb-2">{error}</p>}

          {uploading && (
            <div className="w-full bg-gray-700 rounded h-3 mb-3">
              <div
                className="bg-purple-500 h-3 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Post to Vision Square"}
          </button>
        </div>
      )}
    </div>
  );
}
