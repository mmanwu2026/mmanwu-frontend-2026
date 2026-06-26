"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

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

  // ⭐ Upload avatar to Supabase Storage
  async function uploadAvatar(file: File) {
    const filePath = `${userId}.png`;

    // Upload to storage
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

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  // ⭐ Handle file selection or drop
  async function handleFile(file: File) {
    const publicUrl = await uploadAvatar(file);
    if (!publicUrl) return;

    setPreview(publicUrl);

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    router.refresh();
  }

  // ⭐ Input change
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // ⭐ Drag-and-drop
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-24 h-24 rounded-full overflow-hidden border border-white/20 cursor-pointer group"
    >
      <img
        src={preview || "/fallback-avatar.png"}
        className="w-full h-full object-cover"
      />

      {/* Invisible file input */}
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition">
        Change Avatar
      </div>
    </div>
  );
}
