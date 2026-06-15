"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function EditProfilePage() {
  const { user } = useUser();

  const [username, setUsername] = useState(user?.username ?? "");
  const [avatar, setAvatar] = useState(user?.avatar_url ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);

  async function saveChanges() {
    if (!user) return;

    setSaving(true);

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        username,
        avatar_url: avatar,
        bio,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.user) {
      alert("Profile updated successfully");
      window.location.href = `/profile/${user.id}`;
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Avatar URL</label>
          <input
            className="border p-2 rounded w-full"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            className="border p-2 rounded w-full"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
