"use client";

import React from "react";

export default function BuildBanner() {
  const buildId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID;
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const isEnvOk = Boolean(supabaseUrl);
  const isBuildOk = Boolean(buildId);

  return (
    <div className="w-full bg-black text-white text-xs p-2 border-b border-purple-700">
      <div className="flex flex-col gap-1">
        <span>
          <strong>Build:</strong>{" "}
          {isBuildOk ? buildId : "⚠️ No deployment ID"}
        </span>

        <span>
          <strong>Built:</strong>{" "}
          {buildTime ? buildTime : "⚠️ No build timestamp"}
        </span>

        <span>
          <strong>Supabase URL:</strong>{" "}
          {isEnvOk ? "OK" : "❌ MISSING — Uploads will fail"}
        </span>

        {!isEnvOk && (
          <span className="text-red-400">
            Vision uploads, media_url, comments, share buttons will break.
          </span>
        )}
      </div>
    </div>
  );
}
