"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

export default function MessengerComposer({
  userId,
  otherUserId,
  roomId
}: {
  userId: string;
  otherUserId: string;
  roomId: string;
}) {
  const supabase = useSupabase();
  const [text, setText] = useState("");

  async function sendMessage() {
    if (!text.trim()) return;

    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: otherUserId,
      room_id: roomId,            // ⭐ REQUIRED NOW
      content: text.trim(),
      message_type: "text"
    });

    setText("");
  }

  async function startCall() {
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: otherUserId,
      room_id: roomId,            // ⭐ REQUIRED NOW
      message_type: "call_offer",
      metadata: { action: "start_call" }
    });
  }

  return (
    <div className="p-4 border-t border-neutral-800 flex gap-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        className="flex-1 bg-neutral-800 text-gray-200 px-3 py-2 rounded"
      />

      <button
        onClick={sendMessage}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"
      >
        Send
      </button>

      <button
        onClick={startCall}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
      >
        Call
      </button>
    </div>
  );
}
