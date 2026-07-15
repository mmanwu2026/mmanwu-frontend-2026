"use client";

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAwfuss2PPc6rG3MJljxZFJ5ZuzC9L4KHI",
  authDomain: "mman-plaza.firebaseapp.com",
  projectId: "mman-plaza",
  storageBucket: "mman-plaza.firebasestorage.app",
  messagingSenderId: "328867796060",
  appId: "1:328867796060:web:af1fd5cc070d3097084299",
};

export async function registerPushToken(userId: string, supabase: any) {
  // ⭐ Ensure browser supports FCM
  if (!(await isSupported())) {
    console.log("Firebase Messaging not supported");
    return;
  }

  // ⭐ Wait for SW control
  const registration = await navigator.serviceWorker.ready;

  // ⭐ Initialize Firebase Messaging AFTER SW is ready
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  try {
    const token = await getToken(messaging, {
  serviceWorkerRegistration: registration,
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
