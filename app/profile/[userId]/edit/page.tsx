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
  const supabase = useSupabase();

  const [sessionReady, setSessionReady] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ⭐ FIXED: Reliable session resolver using onAuthStateChange
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
async (_event: string, session: { user: { id: string } } | null) => {
        setSessionReady(true);

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        if (params.userId === "me") {
          setResolvedUserId(session.user.id);
        } else {
          setResolvedUserId(params.userId);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [params.userId, supabase, router]);

  // ⭐ Load Profile
  const loadProfile = useCallback(async () => {
    if (!resolvedUserId) return;

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    // Prevent editing another user's profile
    if (authData.user.id !== resolvedUserId) {
      router.replace(`/profile/${authData.user.id}/edit`);
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", resolvedUserId)
      .maybeSingle();

    if (!userData) return;

    const typed = userData as UserProfile;

    setProfile(typed);
    setUsername(typed.username || "");
    setBio(typed.bio || "");
    setAvatarUrl(typed.avatar_url || null);
  }, [supabase, resolvedUserId, router]);

  // ⭐ Load after session ready
  useEffect(() => {
    if (sessionReady && resolvedUserId) {
      loadProfile();
    }
  }, [sessionReady, resolvedUserId, loadProfile]);

  // ⭐ Avatar Upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !resolvedUserId) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${resolvedUserId}.${fileExt}`;
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

    await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", resolvedUserId);

    setAvatarUrl(publicUrl);
  }

  // ⭐ Save Profile
  async function handleSave() {
    if (!resolvedUserId) return;

    setSaving(true);

    await supabase
      .from("users")
      .update({
        username,
        bio,
      })
      .eq("id", resolvedUserId);

    setSaving(false);
    router.push(`/profile/${resolvedUserId}`);
  }

  // ⭐ Loading state
  if (!sessionReady || !resolvedUserId || !profile) {
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
