"use client";

import { useState, useEffect } from "react";
import SessionWarningModal from "./components/SessionWarningModal";
import { useSupabase } from "@/context/SupabaseContext";

export default function IdleWrapper({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase(); // ⭐ FIXED

  const WARNING_TIME = 2 * 60 * 1000; // show warning 2 minutes before logout
  const LOGOUT_TIME = 30 * 60 * 1000; // full idle timeout (30 min)

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // 120 seconds

  useEffect(() => {
    let warningTimer: NodeJS.Timeout;
    let logoutTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const resetTimers = () => {
      setShowWarning(false);
      setCountdown(120);

      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      clearInterval(countdownTimer);

      warningTimer = setTimeout(() => {
        setShowWarning(true);

        countdownTimer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownTimer);
            }
            return prev - 1;
          });
        }, 1000);
      }, LOGOUT_TIME - WARNING_TIME);

      logoutTimer = setTimeout(async () => {
        const session = await supabase.auth.getSession(); // ⭐ FIXED
        if (!session.data.session) {
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
  }, [supabase]);

  const stayLoggedIn = async () => {
    setShowWarning(false);
    setCountdown(120);

    await supabase.auth.refreshSession(); // ⭐ FIXED
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
