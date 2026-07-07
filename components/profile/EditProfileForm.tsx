"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  website_url?: string | null;
};

type EditProfileFormProps = {
  profile: Profile;
  onClose: () => void;
};

export default function EditProfileForm({ profile, onClose }: EditProfileFormProps) {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [location, setLocation] = useState(profile.location || "");
  const [website, setWebsite] = useState(profile.website_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      setError("Username can only contain lowercase letters, numbers, and underscores.");
      return;
    }

    setSaving(true);
    try {
      const { data: existing, error: usernameError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmedUsername)
        .neq("id", profile.id)
        .limit(1);

      if (usernameError) {
        setError("Error checking username. Please try again.");
        setSaving(false);
        return;
      }

      if (existing && existing.length > 0) {
        setError("That username is already taken.");
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          username: trimmedUsername,
          bio: bio.trim() || null,
          location: location.trim() || null,
          website_url: website.trim() || null,
        })
        .eq("id", profile.id);

      if (updateError) {
        setError("Failed to save changes. Please try again.");
        setSaving(false);
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-white">Edit Profile</h2>
        <button
          onClick={onClose}
          className="text-xs md:text-sm text-white/60 hover:text-white"
        >
          Close
        </button>
      </div>

      {/* ⭐ SAFE AVATAR WRAPPER — prevents modal shrink */}
      <div className="flex flex-col items-center mb-6 w-full overflow-hidden">
        <div className="w-24 h-24 rounded-full overflow-hidden border border-white/20 bg-neutral-900 mb-3 shrink-0">
          <img
            src={
              profile.avatar_url ||
              "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png"
            }
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs text-white/50">
          Change avatar from your profile page
        </p>
      </div>

      <div className="space-y-4 md:space-y-5">
        <div>
          <label className="block text-xs text-white/60 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-neutral-900 border border-white/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-neutral-900 border border-white/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
          <p className="mt-1 text-[11px] text-white/40">
            Lowercase, numbers, and underscores only.
          </p>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full bg-neutral-900 border border-white/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-neutral-900 border border-white/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Website</label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full bg-neutral-900 border border-white/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            placeholder="https://example.com"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-3 py-2 text-xs md:text-sm rounded border border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs md:text-sm rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
