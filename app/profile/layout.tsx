import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">

      <div className="flex justify-around border-b border-white/10 pb-3 text-white/60 text-sm">
        <Link href="#" className="hover:text-white">Posts</Link>
        <Link href="#" className="hover:text-white">Sound Square</Link>
        <Link href="#" className="hover:text-white">Reactions</Link>
      </div>

      {children}
    </div>
  );
}
