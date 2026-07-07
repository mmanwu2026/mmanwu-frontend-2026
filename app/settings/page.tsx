"use client";

export default function SettingsPage() {
  async function requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
    } catch (err) {
      console.error("Permission request failed:", err);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-white text-xl mb-4">Settings</h1>

      <button
        onClick={requestPermission}
        className="text-white px-4 py-2 rounded bg-purple-600 hover:bg-purple-500"
      >
        Enable Notifications
      </button>
    </div>
  );
}
