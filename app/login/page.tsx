// plaza-login-bust-1
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !data.session) {
      setError(loginError?.message || "Login failed");
      setLoading(false);
      return;
    }

    // Redirect to Plaza (new home)
    router.push("/plaza");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 bg-zinc-900 p-6 rounded-xl border border-zinc-700"
      >
        <h1 className="text-2xl font-semibold">Log in</h1>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="w-full rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm py-2 mt-2"
        >
          Need an account? Sign up
        </button>
      </form>
    </div>
  );
}
