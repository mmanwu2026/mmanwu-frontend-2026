"use client";

export default function ProfileClient({ userId }: { userId: string }) {
  console.log("🔵 ProfileClient RENDER, userId:", userId);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <p className="text-zinc-200 text-sm">
        ProfileClient is mounted. userId: {userId}
      </p>
    </div>
  );
}
