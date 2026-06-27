"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

type AvatarUploaderProps = {
  userId: string;
  currentAvatar: string | null;
};

export default function AvatarUploader({ userId, currentAvatar }: AvatarUploaderProps) {
  const supabase = useSupabase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ⭐ Prevent hydration freeze
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Profile update error:", updateError);
        setUploading(false);
        return;
      }

      // Update preview
      setPreview(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="w-full h-full bg-neutral-800 animate-pulse rounded-full" />
    );
  }

  return (
    <div
      className="relative w-full h-full cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <img
        src={preview || currentAvatar || "/default-avatar.png"}
        alt="Avatar"
        className="w-full h-full object-cover"
      />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
          Uploading…
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
