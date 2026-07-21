"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { supabase } = useSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id || null;
      setUserId(id);

      if (!id) return;

      await loadProfile(id);
      await loadPendingRequests(id);

      setLoading(false);
    }
    loadUser();
  }, [supabase]);

/* ---------------- LOAD PROFILE (SAFE) ---------------- */
async function loadProfile(id: string) {
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) {
    setProfile(null);
    return;
  }

  const profile = rows?.[0] ?? null;
  setProfile(profile);
}

  /* ---------------- LOAD FOLLOW REQUESTS ---------------- */
  async function loadPendingRequests(id: string) {
    const { data } = await supabase
      .from("follow_requests")
      .select("*, requester:requester_id(*)")
      .eq("target_id", id)
      .eq("status", "pending");

    setPendingRequests(data || []);
  }

  /* ---------------- SAVE PRIVACY SETTINGS ---------------- */
  async function saveSettings() {
    if (!userId || !profile) return;

    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        privacy_type: profile.privacy_type,   // ⭐ FIXED
        dm_permission: profile.dm_permission, // correct
      })
      .eq("id", userId);

    setSaving(false);
    alert("Settings updated.");
  }

  /* ---------------- APPROVE FOLLOW REQUEST ---------------- */
  async function approveRequest(requesterId: string) {
    await supabase
      .from("follow_requests")
      .update({ status: "accepted" })
      .eq("requester_id", requesterId)
      .eq("target_id", userId);

    await loadPendingRequests(userId!);
  }

  /* ---------------- REJECT FOLLOW REQUEST ---------------- */
  async function rejectRequest(requesterId: string) {
    await supabase
      .from("follow_requests")
      .update({ status: "rejected" })
      .eq("requester_id", requesterId)
      .eq("target_id", userId);

    await loadPendingRequests(userId!);
  }

  if (loading) {
    return (
      <div className="text-white p-4">
        <h1 className="text-xl font-bold mb-4">Settings</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="text-white p-4 space-y-8">
      <h1 className="text-xl font-bold mb-4">Settings</h1>

      {/* ---------------- PRIVACY SETTINGS ---------------- */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Privacy</h2>

        {/* ⭐ FIXED: privacy_type instead of is_private */}
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={profile.privacy_type === "private"}
            onChange={(e) =>
              setProfile({
                ...profile,
                privacy_type: e.target.checked ? "private" : "public",
              })
            }
          />
          <span>
            {profile.privacy_type === "private"
              ? "Your profile is private — only approved followers can DM you."
              : "Your profile is public — anyone can DM you."}
          </span>
        </label>

        <label className="flex items-center gap-3">
          <span className="font-semibold">DM Permission:</span>
          <select
            value={profile.dm_permission || "everyone"}
            onChange={(e) =>
              setProfile({ ...profile, dm_permission: e.target.value })
            }
            className="bg-neutral-800 px-2 py-1 rounded"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers Only</option>
          </select>
        </label>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* ---------------- FOLLOW REQUESTS ---------------- */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Follow Requests</h2>

        {pendingRequests.length === 0 ? (
          <p className="opacity-70">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.requester_id}
                className="flex items-center justify-between"
              >
                <span>
                  {req.requester.display_name || req.requester.username}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveRequest(req.requester_id)}
                    className="px-3 py-1 bg-green-600 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectRequest(req.requester_id)}
                    className="px-3 py-1 bg-red-600 rounded"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
