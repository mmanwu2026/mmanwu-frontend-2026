"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useIdentity } from "@/app/context/IdentityContext";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

type FollowRow = {
  following_id: string;
};

type User = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowingClient({ profileId }: { profileId: string }) {
  const { supabase } = useSupabase();
  const { fetchCreator } = useIdentity();

  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowing() {
      setLoading(true);

      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileId);

      const ids = (followRows ?? []).map((r: FollowRow) => r.following_id);

      if (ids.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      const users: User[] = [];
      for (const id of ids) {
        const creator = await fetchCreator(id);
        if (creator) {
          users.push({
            id: creator.id,
            username: creator.username ?? "",
            display_name: creator.username,
            avatar_url: creator.avatar_url,
          });
        }
      }

      setFollowing(users);
      setLoading(false);
    }

    loadFollowing();
  }, [profileId, supabase, fetchCreator]);

  if (loading) {
    return <p className="text-gray-500 text-center mt-6">Loading following…</p>;
  }

  if (following.length === 0) {
    return <p className="text-gray-500 text-center mt-6">Not following anyone yet…</p>;
  }

  return (
    <div className="space-y-4">
      {following.map((u) => (
        <div key={u.id} className="flex items-center gap-3">
          <img
            src={u.avatar_url ?? FALLBACK_AVATAR}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {u.display_name ?? u.username}
            </p>
            <p className="text-xs text-gray-500">@{u.username}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
