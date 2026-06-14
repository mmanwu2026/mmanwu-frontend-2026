"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function CreatorProfile({ params }: { params: { userId: string } }) {
  const { userId } = params;

  const { user: currentUser } = useUser(); // Logged-in user
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const base = BACKEND_URL.replace(/\/$/, "");

      // Fetch user info
      const userRes = await fetch(`${base}/users/${userId}`);
      const userData = await userRes.json();

      // Fetch aura + posts
      const profileRes = await fetch(`${base}/profile/${userId}`);
      const profileData = await profileRes.json();

      setUser(userData.user);
      setProfile(profileData.profile);
      setPosts(profileData.posts);
      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) return <div className="p-6">Loading profile…</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <img
          src={user.avatar_url ?? "/default-avatar.png"}
          className="w-20 h-20 rounded-full border"
        />
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-gray-400">{user.bio}</p>

          {/* Edit Profile Button — only for the owner */}
          {currentUser?.id === userId && (
            <button
              onClick={() => (window.location.href = "/edit-profile")}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Aura */}
      <div
        className="p-4 rounded-lg text-white"
        style={{
          background: profile.auraColor,
          boxShadow: `0 0 ${profile.auraGlow}rem ${profile.auraColor}`,
        }}
      >
        <p>Ascension Level: {profile.ascensionLevel}</p>
        <p>Spirit Score: {profile.totalSpirit}</p>
        <p>Positivity Ratio: {(profile.positivityRatio * 100).toFixed(1)}%</p>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Posts</h2>
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="p-4 border rounded-lg">
              <p>{p.content}</p>
              <p className="text-sm text-gray-500">
                Spirit Score: {p.spiritScore}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
