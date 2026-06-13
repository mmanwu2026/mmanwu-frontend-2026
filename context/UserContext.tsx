"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  spirit_score: number;
  mask_tier: number;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      let userId = localStorage.getItem("mmanwu_user_id");

      // If no user exists, create one
      if (!userId) {
        const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/users/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `user_${Math.floor(Math.random() * 100000)}`,
            avatar_url: null,
            bio: "",
          }),
        });

        const data = await res.json();
        userId = data.user.id;

        // ⭐ FIX: assert non-null
        localStorage.setItem("mmanwu_user_id", userId!);
      }

      // Fetch user profile
      const profileRes = await fetch(
        `${BACKEND_URL.replace(/\/$/, "")}/users/${userId}`
      );
      const profileData = await profileRes.json();

      setUser(profileData.user);
      setLoading(false);
    }

    init();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
