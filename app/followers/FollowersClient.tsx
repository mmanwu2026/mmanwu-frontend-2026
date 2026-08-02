"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useIdentity } from "@/app/context/IdentityContext";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

type FollowRow = {
  follower_id: string;
};

type User = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowersClient({ profileId }: { profileId?: string }) {
  const { supabase } = useSupabase();
  const { fetchCreator } = useIdentity();

  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;

    async function loadFollowers() {
      setLoading(true);

      const { data: followRows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profileId);

      const ids = (followRows ?? []).map((r: FollowRow) => r.follower_id);

      if (ids.length === 0) {
        setFollowers([]);
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

      setFollowers(users);
      setLoading(false);
    }

    loadFollowers();
  }, [profileId, supabase, fetchCreator]);

  if (!profileId) {
    return <p className="text-gray-500 text-center mt-6">Invalid profile.</p>;
  }

  if (loading) {
    return <p className="text-gray-500 text-center mt-6">Loading followers…</p>;
  }

  if (followers.length === 0) {
    return <p className="text-gray-500 text-center mt-6">No followers yet…</p>;
  }

  return (
    <div className="space-y-4">
      {followers.map((u) => (
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
