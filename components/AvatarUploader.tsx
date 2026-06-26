"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";
import CropModal from "./CropModal";
import { getCroppedImg } from "@/utils/cropImage";

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

  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [loading, setLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // -----------------------------
  // SAFE MODE: Auto-upload if ≤300x300
  // -----------------------------
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject huge files
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Please upload an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;

        // Auto-upload if already small enough
        if (width <= 300 && height <= 300) {
          uploadDirectly(file);
        } else {
          // Otherwise open cropper
          setCropSrc(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  // -----------------------------
  // DIRECT UPLOAD (≤300x300)
  // -----------------------------
  async function uploadDirectly(file: File) {
    setLoading(true);

    const filePath = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl + "?t=" + Date.now();

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setPreview(publicUrl);
    setLoading(false);
    router.refresh();
  }

  // -----------------------------
  // CROPPED UPLOAD (>300x300)
  // -----------------------------
  async function handleCrop(crop: any, zoom: number) {
    if (!cropSrc) return;

    setLoading(true);

    const croppedBlob = await getCroppedImg(cropSrc, crop, zoom);
    const filePath = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, croppedBlob, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl + "?t=" + Date.now();

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setPreview(publicUrl);
    setCropSrc(null);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="relative w-24 h-24 overflow-hidden rounded-full border border-white/20">

      <img
        src={preview || FALLBACK_AVATAR}
        onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
        className="w-full h-full object-cover"
      />

      <input
        id="avatar-upload-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
      />

      {loading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      )}

      {cropSrc && (
        <CropModal
          src={cropSrc}
          cancel={() => setCropSrc(null)}
          cropDone={handleCrop}
        />
      )}
    </div>
  );
}
