"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback.png";

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

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const httpsUrl = publicUrlData.publicUrl.replace("http://", "https://");
    return httpsUrl;
  }

  async function handleFile(file: File) {
    setLoading(true);

    const publicUrl = await uploadAvatar(file);
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
      <div className="relative w-24 h-24 rounded-full overflow-hidden border border-white/20 cursor-pointer group">
        <img
          src={preview || FALLBACK_AVATAR}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_AVATAR;
          }}
        />

        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-20"
        />

        {!loading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition z-10">
            Change Avatar
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

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
