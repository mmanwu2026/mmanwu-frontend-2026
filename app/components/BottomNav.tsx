"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MusicalNoteIcon,
  VideoCameraIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function BottomNav() {
  const pathname = usePathname() || "/";

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="w-full h-[60px] bg-neutral-900 border-t border-neutral-700 text-white flex items-center justify-around pointer-events-auto">
      
      {/* PLAZA */}
      <Link href="/plaza" className="flex flex-col items-center gap-1">
        <SparklesIcon
          className={`w-6 h-6 ${
            isActive("/plaza") ? "text-purple-400" : "text-neutral-400"
          }`}
        />
        <span className="text-xs">Plaza</span>
      </Link>

      {/* SOUND */}
      <Link href="/sound-square" className="flex flex-col items-center gap-1">
        <MusicalNoteIcon
          className={`w-6 h-6 ${
            isActive("/sound-square") ? "text-purple-400" : "text-neutral-400"
          }`}
        />
        <span className="text-xs">Sound</span>
      </Link>

      {/* VISION */}
      <Link href="/vision-square" className="flex flex-col items-center gap-1">
        <VideoCameraIcon
          className={`w-6 h-6 ${
            isActive("/vision-square") ? "text-purple-400" : "text-neutral-400"
          }`}
        />
        <span className="text-xs">Vision</span>
      </Link>

      {/* ALERTS */}
      <Link href="/notifications" className="flex flex-col items-center gap-1">
        <BellIcon
          className={`w-6 h-6 ${
            isActive("/notifications") ? "text-purple-400" : "text-neutral-400"
          }`}
        />
        <span className="text-xs">Alerts</span>
      </Link>

      {/* CHAT */}
      <Link href="/messenger" className="flex flex-col items-center gap-1">
        <ChatBubbleLeftRightIcon
          className={`w-6 h-6 ${
            isActive("/messenger") ? "text-purple-400" : "text-neutral-400"
          }`}
        />
        <span className="text-xs">Chat</span>
      </Link>

    </nav>
  );
}
