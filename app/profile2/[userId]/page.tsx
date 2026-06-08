// vercel sync 013
// hard invalidate test
// backend url fix active
// app/profile2/[userId]/page.tsx

import React from "react";

interface ProfileData {
  id: string;
  mask: number;
  joinedAt: string;
  totalSpirit: number;
  totalReactions: number;
  positivityRatio: number;
  ascensionLevel: number;
  auraColor: string;
  auraGlow: number;
  auraPulse: string;
}

interface PostData {
  id: number;
  content: string;
  mask: number;
  createdAt: string;
  spiritScore: number;
  reactions: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default async function ProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const { userId } = params;

  // ⭐ Forces Vercel to rebuild server bundle
  const vercelSync = "010-FINAL";

  // ⭐ FIXED: Hard-coded backend URL (env var was undefined on Vercel)
  const baseUrl = "https://mmanwu-clean-production-6465.up.railway.app";

  let data;

  try {
    const res = await fetch(`${baseUrl}/profile/${userId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return (
        <div className="p-6 text-center text-red-500">
          Profile not found.
        </div>
      );
    }

    data = await res.json();
  } catch (err) {
    return (
      <div className="p-6 text-center text-red-500">
        Shrine temporarily unavailable. Please refresh.
      </div>
    );
  }

  const profile: ProfileData = data.profile;
  const posts: PostData[] = data.posts;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        Creator Shrine: {profile.id}
      </h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6 shadow">
        <p><strong>Mask:</strong> {profile.mask}</p>
        <p><strong>Joined:</strong> {profile.joinedAt}</p>
        <p><strong>Total Spirit:</strong> {profile.totalSpirit}</p>
        <p><strong>Total Reactions:</strong> {profile.totalReactions}</p>
        <p>
          <strong>Positivity Ratio:</strong>{" "}
          {Math.round(profile.positivityRatio * 100)}%
        </p>
        <p><strong>Ascension Level:</strong> {profile.ascensionLevel}</p>

        <div className="mt-4">
          <p><strong>Aura Color:</strong></p>
          <div
            className="w-24 h-6 rounded mb-2"
            style={{ backgroundColor: profile.auraColor }}
          ></div>

          <p><strong>Glow Intensity:</strong> {profile.auraGlow}</p>
          <p><strong>Pulse:</strong> {profile.auraPulse}</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-3">Posts</h2>

      {posts.length === 0 ? (
        <p className="text-gray-500">This creator has no posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border p-4 rounded-lg shadow-sm bg-white"
            >
              <p className="text-lg">{post.content}</p>
              <p className="text-sm text-gray-500">
                Posted on {post.createdAt}
              </p>
              <p className="mt-2">
                <strong>Spirit Score:</strong> {post.spiritScore}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ⭐ Safe rebuild trigger
export function vercelInvalidate() {
  return "invalidate-010-FINAL";
}

// ⭐ Guaranteed Vercel rebuild trigger
export const forceRebuild = true;

// ⭐ Deep invalidation for dynamic route bundle
export const vercelHardInvalidate = "010-FINAL";
