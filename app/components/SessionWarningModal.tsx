"use client";

import React from "react";

export default function SessionWarningModal({
  visible,
  countdown,
  onStayLoggedIn,
}: {
  visible: boolean;
  countdown: number;
  onStayLoggedIn: () => void; // this MUST refresh the session
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-xl w-[320px] text-center space-y-4 shadow-xl">
        <h2 className="text-lg font-bold">Are you still there?</h2>

        <p>Your session will expire in {countdown} seconds.</p>

        <button
          onClick={onStayLoggedIn}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-700 transition"
        >
          Stay Logged In
        </button>
      </div>
    </div>
  );
}
