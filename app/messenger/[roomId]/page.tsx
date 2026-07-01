"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import MessengerThread from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  if (!params) return null;

  const roomId = params.roomId;

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    }

    loadMessages();
  }, [roomId, supabase]);

  async function sendMessage() {
    if (!input.trim() || !userId) return;

    await supabase.from("messages").insert({
      room_id: roomId,
      sender_id: userId,
      content: input,
      message_type: "text",
    });

    setInput("");
  }

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return (
  <div className="flex flex-col h-full bg-black text-white">

    {/* ⭐ MessengerThread MUST be visible */}
    <MessengerThread
      userId={userId}
      otherUserId={undefined}
      roomId={roomId}
    />

    {/* ⭐ Your messaging UI */}
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => (
        <div key={msg.id} className="text-sm">
          <strong>{msg.sender_id}</strong>: {msg.content}
        </div>
      ))}
    </div>

    {/* ⭐ Message composer */}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage();
      }}
      className="p-4 flex gap-2 border-t border-gray-700"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1 bg-gray-800 text-white p-2 rounded"
        placeholder="Type a message…"
      />

      <button
        type="submit"
        className="bg-blue-600 px-4 py-2 rounded text-white"
      >
        Send
      </button>
    </form>

  </div>
);
}