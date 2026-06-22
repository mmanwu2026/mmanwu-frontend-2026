"use client";

import React, { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";

export default function LoginPage() {
  // ⭐ GLOBAL SUPABASE CLIENT — SAFE
  const supabase = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // ⭐ Prevent double submissions
    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // ⭐ Friendlier error messaging
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Incorrect email or password");
      } else {
        setErrorMsg(error.message);
      }

      setLoading(false);
      return;
    }

    // Let the Plaza layout handle session validation
    window.location.href = "/plaza";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-gray-200 px-6">
      <h1 className="text-3xl font-bold mb-6">Log In</h1>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
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

        {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 rounded bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>

      {/* ⭐ Optional — enable when ready */}
      {/* 
      <p className="mt-3 text-sm">
        <Link href="/reset-password" className="text-purple-400 hover:text-purple-300">
          Forgot password
        </Link>
      </p>
      */}

      <p className="mt-4 text-sm">
        Don’t have an account?{" "}
        <Link href="/signup" className="text-purple-400 hover:text-purple-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}
