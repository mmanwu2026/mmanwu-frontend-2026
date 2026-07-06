"use client";

import { useState } from "react";

export default function NotificationsShell() {
  const [enabled, setEnabled] = useState(false);

  async function enableNotifications() {
    setEnabled(true);

    // Correct paths: go UP from /components → into /app
    const { SWRegister } = await import("../app/sw-register");
    const { PushSubscribe } = await import("../app/push-subscribe");

    SWRegister();
    PushSubscribe();
  }

  return (
    <button
      onClick={enableNotifications}
      className="text-white px-4 py-2 rounded bg-purple-600"
    >
      Enable Notifications
    </button>
  );
}
