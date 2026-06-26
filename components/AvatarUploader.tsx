"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function AvatarUploader({
  userId,
  currentAvatar,
}: {
  userId: string;
  currentAvatar: string | null;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update profile row
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Profile update error:", updateError);
        return;
      }

      // Force UI refresh
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative w-24 h-24 overflow-hidden rounded-full border border-white/20">
      <img
        src={previewUrl || currentAvatar || FALLBACK_AVATAR}
        onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
        className="w-full h-full object-cover object-center"
      />

      <input
        id="avatar-upload-input"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
      />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs">
          Uploading…
        </div>
      )}
    </div>
  );
}
