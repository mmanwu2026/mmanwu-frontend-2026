"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

// ⭐ Utility: compress image before upload
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");

  const size = Math.min(bitmap.width, bitmap.height);
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    bitmap,
    (bitmap.width - size) / 2,
    (bitmap.height - size) / 2,
    size,
    size,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
  );

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export default function AvatarUploader({
  userId,
  currentAvatar,
}: {
  userId: string;
  currentAvatar: string | null;
}) {
  const supabase = useSupabase();
  const router = useRouter();

  const [preview, setPreview] = useState(currentAvatar);
  const [loading, setLoading] = useState(false);

  // ⭐ Upload avatar to Supabase Storage
  async function uploadAvatar(file: File) {
    const filePath = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return null;
    }

    // ⭐ Force HTTPS to avoid mixed-content blocking
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const httpsUrl = publicUrlData.publicUrl.replace("http://", "https://");

    return httpsUrl;
  }

  // ⭐ Handle file selection or drop
  async function handleFile(file: File) {
    setLoading(true);

    const compressed = await compressImage(file);
    const publicUrl = await uploadAvatar(compressed);

    if (!publicUrl) {
      setLoading(false);
      return;
    }

    setPreview(publicUrl);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setLoading(false);
    router.refresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ⭐ Remove avatar
  async function removeAvatar() {
    setLoading(true);

    await supabase.storage.from("avatars").remove([`${userId}.jpg`]);

    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    setPreview(null);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">

      {/* Avatar container */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative w-24 h-24 rounded-full overflow-hidden border border-white/20 cursor-pointer group"
      >
        {/* Avatar image (lowest layer) */}
        <img
          src={preview || "/default-avatar.png"}
          className="w-full h-full object-cover relative z-0"
          onError={(e) => {
            e.currentTarget.src = "/default-avatar.png";
          }}
        />

        {/* Invisible input (must be highest layer) */}
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-20"
        />

        {/* Hover overlay (middle layer) */}
        {!loading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition z-10">
            Change Avatar
          </div>
        )}

        {/* Loading spinner (middle layer) */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Remove button */}
      {preview && !loading && (
        <button
          onClick={removeAvatar}
          className="text-xs text-red-400 hover:text-red-200 transition"
        >
          Remove Avatar
        </button>
      )}
    </div>
  );
}
