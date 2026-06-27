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

  // Hydration-safe
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [uploading, setUploading] = useState(false);

  // ⭐ Resize + compress to 256x256
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas error");

        // Draw image centered & cover
        const ratio = Math.max(size / img.width, size / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        const offsetX = (size - newWidth) / 2;
        const offsetY = (size - newHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("Compression failed");
            resolve(blob);
          },
          "image/jpeg",
          0.85 // compression quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // ⭐ Resize + compress
      const resizedBlob = await resizeImage(file);

      const filePath = `${userId}-${Date.now()}.jpg`;

      // Upload resized image
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resizedBlob, {
          upsert: true,
          contentType: "image/jpeg",
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
    return <div className="w-full h-full bg-neutral-800 animate-pulse rounded-full" />;
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
