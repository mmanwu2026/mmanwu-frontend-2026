// C8 — Creator Profile Shrine (Scaffold)
"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  mask: number;
  joinedAt: string;
  totalSpirit: number;
  totalReactions: number;
  positivityRatio: number;
  ascensionLevel: number;
  auraSignature: string;
};

type Post = {
  id: number;
  content: string;
  mask: number;
  createdAt: string;
  spiritScore?: number;
};

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const { userId } = params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    try {
      const res = await fetch(
        `https://mmanwu-clean-production-6465.up.railway.app/profile/${userId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();
      setProfile(data.profile);
      setPosts(data.posts);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  if (loading) return <p className="p-6">Loading profile…</p>;
  if (!profile) return <p className="p-6">Profile not found.</p>;

  return (
    <div className="p-6 w-full max-w-md mx-auto">
      {/* Header */}
      <div
        className="p-6 rounded-2xl text-center mb-8 shadow"
        style={{
          border: `3px solid ${profile.auraSignature}`,
          boxShadow: `0 0 20px ${profile.auraSignature}55`,
        }}
      >
        <div className="text-5xl mb-2">
          {profile.mask === 1 && "🜂"}
          {profile.mask === 2 && "🔥"}
          {profile.mask === 3 && "🜁"}
          {profile.mask === 4 && "✨"}
          {profile.mask === 5 && "🌿"}
        </div>

        <h1 className="text-3xl font-bold mb-2">Mask‑Bearer {profile.id}</h1>

        <p className="text-sm text-gray-600">
          Joined: {new Date(profile.joinedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="p-4 rounded-xl bg-gray-50 shadow text-center">
          <div className="text-xl font-bold">{profile.totalSpirit}</div>
          <div className="text-xs text-gray-500">Total Spirit</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 shadow text-center">
          <div className="text-xl font-bold">{profile.totalReactions}</div>
          <div className="text-xs text-gray-500">Reactions</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 shadow text-center">
          <div className="text-xl font-bold">
            {(profile.positivityRatio * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Positivity</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 shadow text-center">
          <div className="text-xl font-bold">{profile.ascensionLevel}</div>
          <div className="text-xs text-gray-500">Ascension</div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-xl font-bold mb-4">Posts by this Creator</h2>

      <div className="space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-4 rounded-xl bg-white shadow border"
          >
            <p className="whitespace-pre-line mb-2">{post.content}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
