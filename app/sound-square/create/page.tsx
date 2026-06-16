"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function CreateSoundPost() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile) return alert("Please upload an audio file.");

    setUploading(true);

    // 1. Upload audio to Supabase Storage
    const fileExt = audioFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `sounds/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("sound_files")
      .upload(filePath, audioFile);

    if (uploadError) {
      console.error(uploadError);
      alert("Audio upload failed.");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("sound_files")
      .getPublicUrl(filePath);

    const audioUrl = publicUrlData.publicUrl;

    // 2. Insert post into database
    const { error: insertError } = await supabase.from("sound_posts").insert({
      title,
      creator_name: creatorName,
      audio_url: audioUrl,
    });

    if (insertError) {
      console.error(insertError);
      alert("Failed to save post.");
      setUploading(false);
      return;
    }

    // 3. Redirect to feed
    router.push("/sound-square/feed");
  }

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Create Sound Post</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-lg">
        <input
          type="text"
          placeholder="Title"
          className="p-3 rounded bg-gray-800"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Creator Name"
          className="p-3 rounded bg-gray-800"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          required
        />

        <input
          type="file"
          accept="audio/*"
          className="p-3 rounded bg-gray-800"
          onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
          required
        />

        <button
          type="submit"
          disabled={uploading}
          className="bg-green-600 px-4 py-3 rounded hover:bg-green-500 disabled:bg-gray-600"
        >
          {uploading ? "Uploading..." : "Upload Sound"}
        </button>
      </form>
    </div>
  );
}
