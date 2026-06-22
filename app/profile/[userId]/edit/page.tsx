"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function EditProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const userId = params.userId;

  // ⭐ GLOBAL SUPABASE CLIENT — SAFE
  const supabase = useSupabase();

  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // -----------------------------
  // Load Profile (memoized)
  // -----------------------------
  const loadProfile = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) return;

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!userData) return;

    const typed = userData as UserProfile;

    setProfile(typed);
    setUsername(typed.username || "");
    setBio(typed.bio || "");
    setAvatarUrl(typed.avatar_url || null);
  }, [supabase, userId]);

  // -----------------------------
  // Avatar Upload Handler
  // -----------------------------
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", userId);

    setAvatarUrl(publicUrl);
  }

  // -----------------------------
  // Save Profile
  // -----------------------------
  async function handleSave() {
    setSaving(true);

    await supabase
      .from("users")
      .update({
        username,
        bio,
      })
      .eq("id", userId);

    setSaving(false);
    router.push(`/profile/${userId}`);
  }

  // -----------------------------
  // Session Hydration
  // -----------------------------
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: any) => {
        if (!session?.user) {
          router.replace("/login");
        } else {
          setSessionReady(true);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  useEffect(() => {
    if (sessionReady) loadProfile();
  }, [sessionReady, loadProfile]);

  if (!sessionReady || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Edit Profile</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src={avatarUrl || "/default-avatar.png"}
            alt="avatar"
            className="w-20 h-20 rounded-full object-cover bg-zinc-800"
          />

          <label className="cursor-pointer text-purple-400 hover:text-purple-300 text-sm">
            Change Avatar
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white h-24"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
