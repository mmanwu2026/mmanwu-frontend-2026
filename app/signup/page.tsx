"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1️⃣ Create Supabase Auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || "Signup failed");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 2️⃣ Auto-generate username
    const randomNumber = Math.floor(1000 + Math.random() * 90000);
    const username = `maskling_${randomNumber}`;

    // 3️⃣ Create profile row in Supabase (correct table: profiles)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name,
      username,
      display_name_enabled: false,
    });

    if (profileError) {
      setError("Profile creation failed");
      setLoading(false);
      return;
    }

    // 4️⃣ Redirect to Plaza (instant login)
    router.push("/plaza");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md space-y-4 bg-zinc-900 p-6 rounded-xl border border-zinc-700"
      >
        <h1 className="text-2xl font-semibold">Sign up</h1>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Your Name</label>
          <input
            type="text"
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Chukwudi Nwawka"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
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
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm py-2 mt-2"
        >
          Already have an account? Log in
        </button>
      </form>
    </div>
  );
}
