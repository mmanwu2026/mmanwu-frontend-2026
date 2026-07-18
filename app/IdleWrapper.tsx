"use client";

import { useState, useEffect } from "react";
import SessionWarningModal from "./components/SessionWarningModal";
import { useSupabase } from "@/app/context/SupabaseContext";

export default function IdleWrapper({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase();

  const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before logout
  const LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes total idle time

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState(null);

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);

  // ⭐ Hydration gate — ensures Supabase has restored the session
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setHydrated(true);
    };

    loadSession();

    // ⭐ Listen for future session changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!hydrated) return;   // ⭐ DO NOT RUN until hydration finishes
    if (!session) return;    // ⭐ DO NOT RUN if user is logged out

    let warningTimer: NodeJS.Timeout;
    let logoutTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const resetTimers = () => {
      setShowWarning(false);
      setCountdown(120);

      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      clearInterval(countdownTimer);

      // ⭐ Show warning 2 minutes before logout
      warningTimer = setTimeout(() => {
        setShowWarning(true);

        countdownTimer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) clearInterval(countdownTimer);
            return prev - 1;
          });
        }, 1000);
      }, LOGOUT_TIME - WARNING_TIME);

      // ⭐ Actual logout
      logoutTimer = setTimeout(async () => {
        const fresh = await supabase.auth.getSession();

        if (!fresh.data.session) {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }
      }, LOGOUT_TIME);
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimers));

    resetTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimers));
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      clearInterval(countdownTimer);
    };
  }, [hydrated, session, supabase]);

  const stayLoggedIn = async () => {
    setShowWarning(false);
    setCountdown(120);

    await supabase.auth.refreshSession(); // ⭐ Safe now because hydration is complete
  };

  return (
    <>
      {children}
      <SessionWarningModal
        visible={showWarning}
        countdown={countdown}
        onStayLoggedIn={stayLoggedIn}
      />
    </>
  );
}
