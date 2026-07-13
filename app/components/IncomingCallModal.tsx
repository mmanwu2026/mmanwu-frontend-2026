"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";

interface IncomingCall {
  id: string;
  room_id: string;
  caller_id: string;
}

export function IncomingCallModal({
  call,
  onClose,
}: {
  call: IncomingCall;
  onClose: () => void;
}) {
  const router = useRouter();
  const { supabase } = useSupabase();

  useEffect(() => {
    const timer = setTimeout(async () => {
      await supabase
        .from("call_events")
        .update({ status: "timeout" })
        .eq("id", call.id);

      onClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [call.id, supabase, onClose]);

  async function accept() {
    await supabase
      .from("call_events")
      .update({ status: "accepted" })
      .eq("id", call.id);

    onClose();
    router.push(`/call/${call.room_id}?role=callee`);
  }

  async function decline() {
    await supabase
      .from("call_events")
      .update({ status: "declined" })
      .eq("id", call.id);

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-neutral-900 p-6 rounded-lg w-full max-w-sm border border-neutral-700">
        <h2 className="text-white text-lg font-semibold mb-2">
          Incoming Call
        </h2>
        <p className="text-neutral-300 mb-4">
          Someone is calling you in room{" "}
          <span className="font-mono">{call.room_id}</span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={accept}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
