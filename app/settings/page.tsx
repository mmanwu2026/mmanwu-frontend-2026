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
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id || null;
      setUserId(id);

      if (!id) return;

      await loadProfile(id);
      await loadPendingRequests(id);
      await loadBlockedUsers(id);

      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  /* ---------------- LOAD PROFILE ---------------- */
  async function loadProfile(id: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(data);
  }

  /* ---------------- LOAD FOLLOW REQUESTS ---------------- */
  async function loadPendingRequests(id: string) {
    const { data } = await supabase
      .from("followers")
      .select("*, follower: follower_id(*)")
      .eq("target_id", id)
      .eq("status", "pending");

    setPendingRequests(data || []);
  }

  /* ---------------- LOAD BLOCKED USERS ---------------- */
  async function loadBlockedUsers(id: string) {
    const { data } = await supabase
      .from("blocks")
      .select("*, blocked: blocked_id(*)")
      .eq("user_id", id);

    setBlockedUsers(data || []);
  }

  /* ---------------- SAVE PRIVACY SETTINGS ---------------- */
  async function saveSettings() {
    if (!userId || !profile) return;

    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        is_private: profile.is_private,
        dm_permission: profile.dm_permission,
      })
      .eq("id", userId);

    setSaving(false);
    alert("Settings updated.");
  }

  /* ---------------- APPROVE FOLLOW REQUEST ---------------- */
  async function approveRequest(followerId: string) {
    await supabase
      .from("followers")
      .update({ status: "approved" })
      .eq("follower_id", followerId)
      .eq("target_id", userId);

    await loadPendingRequests(userId!);
  }

  /* ---------------- REJECT FOLLOW REQUEST ---------------- */
  async function rejectRequest(followerId: string) {
    await supabase
      .from("followers")
      .delete()
      .eq("follower_id", followerId)
      .eq("target_id", userId);

    await loadPendingRequests(userId!);
  }

  /* ---------------- BLOCK USER ---------------- */
  async function blockUser(targetId: string) {
    await supabase.from("blocks").insert({
      user_id: userId,
      blocked_id: targetId,
    });

    await loadBlockedUsers(userId!);
  }

  /* ---------------- UNBLOCK USER ---------------- */
  async function unblockUser(targetId: string) {
    await supabase
      .from("blocks")
      .delete()
      .eq("user_id", userId)
      .eq("blocked_id", targetId);

    await loadBlockedUsers(userId!);
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

        {/* Privacy Toggle */}
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={profile.is_private}
            onChange={(e) =>
              setProfile({ ...profile, is_private: e.target.checked })
            }
          />
          <span>
            {profile.is_private
              ? "Your profile is private — only approved followers can DM you."
              : "Your profile is public — anyone can DM you."}
          </span>
        </label>

        {/* DM Permission */}
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
                key={req.follower_id}
                className="flex items-center justify-between"
              >
                <span>
                  {req.follower.display_name || req.follower.username}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveRequest(req.follower_id)}
                    className="px-3 py-1 bg-green-600 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectRequest(req.follower_id)}
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

      {/* ---------------- BLOCKED USERS ---------------- */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Blocked Users</h2>

        {blockedUsers.length === 0 ? (
          <p className="opacity-70">You have not blocked anyone.</p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((b) => (
              <div
                key={b.blocked_id}
                className="flex items-center justify-between"
              >
                <span>
                  {b.blocked.display_name || b.blocked.username}
                </span>

                <button
                  onClick={() => unblockUser(b.blocked_id)}
                  className="px-3 py-1 bg-red-600 rounded"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
