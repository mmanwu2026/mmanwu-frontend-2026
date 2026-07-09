import type { NextApiRequest, NextApiResponse } from "next";
import webpush from "web-push";

// Configure VAPID keys
webpush.setVapidDetails(
  "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { subscription, payload } = req.body;

    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Push error:", err);
    res.status(500).json({ error: err.message });
  }
}
