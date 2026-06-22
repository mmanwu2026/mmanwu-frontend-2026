"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/context/UserContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface UserProfile {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function EditProfilePage() {
  const { user, loading } = useUser();

  // ⭐ FIX: Memoize Supabase client
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ⭐ BLOCK RENDERING UNTIL USER EXISTS
  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <div className="p-6">You must be logged in.</div>;

  const userId = user.id;

  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    avatar_url: "",
    bio: "",
  });

  const [saving, setSaving] = useState(false);

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("users")
        .select("username, avatar_url, bio")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile({
          username: data.username ?? "",
          avatar_url: data.avatar_url ?? "",
          bio: data.bio ?? "",
        });
      }
    }

    loadProfile();
  }, [userId, supabase]);

  async function saveChanges() {
    setSaving(true);

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        username: profile.username,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.user) {
      alert("Profile updated successfully");
      window.location.href = `/profile/${userId}`;
    } else {
      alert("Failed to update profile");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Username</label>
          <input
            className="border p-2 rounded w-full"
            value={profile.username ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, username: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Avatar URL</label>
          <input
            className="border p-2 rounded w-full"
            value={profile.avatar_url ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, avatar_url: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            className="border p-2 rounded w-full"
            value={profile.bio ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, bio: e.target.value }))
            }
          />
        </div>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
