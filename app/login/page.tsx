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

  // If already logged in, redirect home
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

    // Perform login
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

    if (!data.session?.user) {
      setErrorMsg("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Delay for iOS PWA installability
    await new Promise((resolve) => setTimeout(resolve, 250));

    // ⭐ CRITICAL FIX FOR iOS WEBVIEW
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("iPhone")) {
      window.location.reload(); // Forces React tree + session hydration
      return;
    }

    // Normal PWA navigation
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
