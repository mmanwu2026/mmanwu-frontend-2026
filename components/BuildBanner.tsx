"use client";

import React from "react";

export default function BuildBanner() {
  const buildId =
    process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ||
    "manual-build";
  const buildTime =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    "manual";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "OK"
    : "Missing";

  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        padding: "8px 12px",
        fontSize: "13px",
        fontFamily: "monospace",
        borderBottom: "1px solid #333",
      }}
    >
      <div>Build: {buildId}</div>
      <div>Built: {buildTime}</div>
      <div>Supabase URL: {supabaseUrl}</div>
    </div>
  );
}
