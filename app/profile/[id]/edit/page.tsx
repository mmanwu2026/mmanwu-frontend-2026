"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

interface Profile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function EditProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { supabase } = useSupabase();

  // ⭐ Replaces useUser()
  const [uid, setUid] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  // ⭐ Load authenticated user
  useEffect(() => {
    async function loadSession() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setSessionLoading(false);
    }
    loadSession();
  }, [supabase]);

  // ⭐ Guard: only owner can edit
  useEffect(() => {
    if (!hydrated || sessionLoading) return;
    if (!uid) return;

    if (params.id !== uid) {
      router.replace(`/profile/${uid}`);
    }
  }, [hydrated, sessionLoading, uid, params.id, router]);

  // ⭐ Load profile
  useEffect(() => {
    if (!hydrated || sessionLoading) return;
    if (!uid) return;
    if (params.id !== uid) return;

    (async () => {
      setLoadingProfile(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url")
        .eq("id", uid)
        .single();

      if (error || !data) {
        setError("Failed to load profile.");
        setLoadingProfile(false);
        return;
      }

      const p = data as Profile;
      setProfile(p);
      setUsername(p.username ?? "");
      setBio(p.bio ?? "");
      setAvatarUrl(p.avatar_url ?? null);
      setLoadingProfile(false);
    })();
  }, [hydrated, sessionLoading, uid, params.id, supabase]);

  // ⭐ Avatar upload
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    setError(null);

    const filePath = `${uid}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      setError("Failed to upload avatar.");
      return;
    }

    const { data: publicData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      setError("Failed to get avatar URL.");
      return;
    }

    setAvatarUrl(publicData.publicUrl);
  }

  // ⭐ Save profile
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", uid);

    setSaving(false);

    if (updateError) {
      setError("Failed to save profile.");
      return;
    }

    router.push(`/profile/${uid}`);
  }

  // ⭐ Loading states
  if (!hydrated || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile editor…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Please log in to edit your profile.</p>
      </div>
    );
  }

  if (loadingProfile || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading your profile…</p>
      </div>
    );
  }

  // ⭐ Render
  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/80 p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-purple-200 mb-4">
          Edit Profile
        </h1>

        {error && (
          <p className="mb-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="plaza-avatar border border-gray-700 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  No avatar
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Change avatar
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="text-xs text-gray-300"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Your display name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[80px]"
              placeholder="Tell the Plaza who you are…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/profile/${uid}`)}
              className="px-3 py-2 text-xs rounded-md border border-neutral-700 text-gray-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
