"use client";

import React, { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Safety: if already logged in, go home
  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        router.push("/");
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    // Critical: clear any stale session before login
    await supabase.auth.signOut();

    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("LOGIN RESULT:", result);

    const { error, data } = result;

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Incorrect email or password");
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

    // If no session returned, fail gracefully
    if (!data.session?.user) {
      setErrorMsg("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Timeout guard: prevent infinite spinner
    const timeout = setTimeout(() => {
      setLoading(false);
      setErrorMsg("Login timed out. Please try again.");
    }, 10000);

    // Small delay for iOS/PWA installability, then navigate
    await new Promise((resolve) => setTimeout(resolve, 250));

    clearTimeout(timeout);
    setLoading(false);
    router.push("/");
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

      <p className="mt-4 text-sm">
        Don’t have an account{" "}
        <Link href="/signup" className="text-purple-400 hover:text-purple-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}
