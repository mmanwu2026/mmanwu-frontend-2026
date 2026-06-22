"use client";

import React, { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";

export default function SignupPage() {
  const supabase = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // ⭐ Check if username already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      setErrorMsg("Username already taken.");
      setLoading(false);
      return;
    }

    // ⭐ Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setErrorMsg("Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // ⭐ Create profile row with correct defaults
    const { error: profileError } = await supabase.from("users").insert({
      id: userId,
      username,
      bio: "",
      avatar_url: null,
      spirit_score: 0,
      mask_tier: 2, // ⭐ Correct default mask tier
    });

    if (profileError) {
      setErrorMsg(profileError.message);
      setLoading(false);
      return;
    }

    // ⭐ Redirect to plaza
    window.location.href = "/plaza";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-gray-200 px-6">
      <h1 className="text-3xl font-bold mb-6">Create Account</h1>

      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 rounded bg-gray-800 border border-gray-700"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-gray-800 border border-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-gray-800 border border-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {errorMsg && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 rounded bg-purple-600 hover:bg-purple-700 transition"
        >
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account{" "}
        <Link href="/login" className="text-purple-400 hover:text-purple-300">
          Log in
        </Link>
      </p>
    </div>
  );
}
