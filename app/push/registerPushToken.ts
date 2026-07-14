"use client";

// IMPORTANT: Do NOT import firebase messaging at the top level.
// Next.js will try to evaluate this file during SSR.
// We must wrap all Firebase imports inside a browser check.

let messaging: ReturnType<typeof import("firebase/messaging").getMessaging> | null = null;

if (typeof window !== "undefined") {
  // Firebase imports MUST be inside this block
  const { initializeApp } = require("firebase/app");
  const { getMessaging } = require("firebase/messaging");

  const firebaseConfig = {
    apiKey: "AIzaSyAwfuss2PPc6rG3MJljxZFJ5ZuzC9L4KHI",
    authDomain: "mman-plaza.firebaseapp.com",
    projectId: "mman-plaza",
    storageBucket: "mman-plaza.firebasestorage.app",
    messagingSenderId: "328867796060",
    appId: "1:328867796060:web:af1fd5cc070d3097084299",
  };

  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

export async function registerPushToken(userId: string, supabase: any) {
  // Prevent SSR crash
  if (typeof window === "undefined") {
    console.log("registerPushToken called on server — ignored");
    return;
  }

  if (!messaging) {
    console.log("Firebase messaging not initialized");
    return;
  }

  try {
    const { getToken } = require("firebase/messaging");

    const token = await getToken(messaging, {
      vapidKey: "BI9wYnTKpRLirufF3ngG2ylRXlVb5ePw3gNFfdxHd-yjJvwycS-Cdwca4xOvs_InKXenn39yAY2OlVLkDo8bdY",
    });

    if (!token) {
      console.log("No FCM token generated");
      return;
    }

    await supabase.from("user_push_tokens").upsert({
      user_id: userId,
      fcm_token: token,
    });

    console.log("FCM token saved:", token);

  } catch (e) {
    console.log("Push token registration failed", e);
  }
}
