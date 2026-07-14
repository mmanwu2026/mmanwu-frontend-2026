"use client";

import { getMessaging, getToken } from "firebase/messaging";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAwfuss2PPc6rG3MJljxZFJ5ZuzC9L4KHI",
  authDomain: "mman-plaza.firebaseapp.com",
  projectId: "mman-plaza",
  storageBucket: "mman-plaza.firebasestorage.app",
  messagingSenderId: "328867796060",
  appId: "1:328867796060:web:af1fd5cc070d3097084299"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function registerPushToken(userId: string, supabase: any) {
  try {
    const token = await getToken(messaging, {
  vapidKey: "BI9wYnTKpRLirufF3ngG2ylRXlVb5ePw3gNFfdxHd-yjJvwycS-Cdwca4xOvs_InKXenn39yAY2OlVLkDo8bdY"
});

    if (!token) return;

    await supabase.from("user_push_tokens").upsert({
      user_id: userId,
      fcm_token: token,
    });
  } catch (e) {
    console.log("Push token registration failed", e);
  }
}
