"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import Image from "next/image";

export default function FollowRequestsClient({ requests }) {
  const { supabase } = useSupabase();

  async function approveRequest(id, requesterId) {
    // 1. Mark request as approved
    await supabase
      .from("follow_requests")
      .update({ status: "approved" })
      .eq("id", id);

    // 2. Insert into follows table
    await supabase.from("follows").insert({
      follower_id: requesterId,
      following_id: supabase.auth.user().id,
    });

    // ⭐ PATCH 10 — Auto‑unlock DM thread when follow request is approved
await supabase
  .from("rooms")
  .update({ locked: false })
  .or(
  `participant_one.eq.${requesterId},participant_two.eq.${supabase.auth.user().id}`
)
.or(
  `participant_one.eq.${supabase.auth.user().id},participant_two.eq.${requesterId}`
)

    // 3. Refresh page
    window.location.reload();
  }

  async function declineRequest(id) {
    await supabase
      .from("follow_requests")
      .update({ status: "declined" })
      .eq("id", id);

    window.location.reload();
  }

  if (!requests.length) {
    return <div className="mt-10 text-gray-400">No pending follow requests.</div>;
  }

  return (
    <div className="mt-10 space-y-4">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between bg-gray-800 p-4 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Image
              src={req.requester.avatar_url || "/default-avatar.png"}
              width={48}
              height={48}
              className="rounded-full"
              alt="avatar"
            />
            <div>
              <div className="font-semibold">{req.requester.display_name}</div>
              <div className="text-gray-400 text-sm">@{req.requester.username}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => approveRequest(req.id, req.requester_id)}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
            >
              Approve
            </button>

            <button
              onClick={() => declineRequest(req.id)}
              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
