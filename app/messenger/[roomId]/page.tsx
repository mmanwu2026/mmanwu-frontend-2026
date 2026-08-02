"use client";

import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState, useRef } from "react";
import MessengerThread, {
  MessengerThreadHandle,
} from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const router = useRouter();
  const { supabase } = useSupabase();

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [otherUserId, setOtherUserId] = useState<string | undefined>(undefined);

  const [dmAllowed, setDmAllowed] = useState<boolean | null>(null);

  const threadRef = useRef<MessengerThreadHandle | null>(null);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  /* ---------------- LOAD OTHER PARTICIPANT ---------------- */
  useEffect(() => {
    if (!userId || !roomId) return;

    async function loadOther() {
      const { data } = await supabase
        .from("room_participants")
        .select("user_id")
        .eq("room_id", roomId);

      if (!data) return;

      const others = data.filter(
        (p: { user_id: string }) => p.user_id !== userId
      );

      if (others.length > 0) {
        setOtherUserId(others[0].user_id);
      }
    }

    loadOther();
  }, [userId, roomId, supabase]);

  /* ---------------- DM PRIVACY CHECK ---------------- */
  useEffect(() => {
    if (!userId || !otherUserId || !roomId) return;

    async function checkDmPrivacy() {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("privacy_type")
        .eq("id", otherUserId)
        .limit(1);

      const profile = profileRows?.[0] ?? null;

      if (!profile) {
        setDmAllowed(false);
        return;
      }

      const isPrivate = profile.privacy_type === "private";
      const isOwner = userId === otherUserId;

      if (!isPrivate) {
        setDmAllowed(true);
        return;
      }

      const { data: followRows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId) // viewer
        .eq("following_id", otherUserId) // target
        .limit(1);

      const isFollower = !!followRows?.[0];

      const allowed = isOwner || isFollower;

      setDmAllowed(allowed);

      const { data: roomRows } = await supabase
        .from("rooms")
        .select("locked")
        .eq("id", roomId)
        .limit(1);

      const room = roomRows?.[0] ?? null;

      if (room?.locked) {
        setDmAllowed(false);
      }
    }

    checkDmPrivacy();
  }, [userId, otherUserId, roomId, supabase]);

  /* ---------------- LOADING USER ---------------- */
  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  /* ---------------- CALL HANDLER ---------------- */
  function handleStartCall() {
    threadRef.current?.startCall();
  }

  /* ---------------- DM ALLOWED ---------------- */
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-gray-800">
        <button
          onClick={() => router.push("/messenger")}
          className="px-3 py-2 bg-gray-800 rounded-lg text-sm"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Conversation</h1>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Conversation</h1>
      </div>

      {/* Scrollable Thread Area */}
      <div className="flex-1 overflow-y-auto">
        <MessengerThread
          ref={threadRef}
          userId={userId}
          roomId={roomId}
          otherUserId={otherUserId}
          dmAllowed={dmAllowed ?? false}
        />
      </div>

      {/* Floating Back Button */}
      <button
        onClick={() => router.push("/messenger")}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-4 
                   z-[999] px-4 py-2 bg-gray-800 rounded-full text-sm shadow-xl"
      >
        Back
      </button>

      {/* Floating Call Button */}
      {otherUserId && (
        <button
          onClick={handleStartCall}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 
                     z-[999] px-4 py-2 bg-green-600 rounded-full text-sm shadow-xl"
        >
          Call
        </button>
      )}
    </div>
  );
}
