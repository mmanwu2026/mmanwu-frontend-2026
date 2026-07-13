"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MusicalNoteIcon,
  VideoCameraIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function BottomNav() {
  const pathname = usePathname() || "/";

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 w-full h-[70px] bg-neutral-900 border-t border-neutral-700 text-white flex items-center justify-around z-[999999] pointer-events-auto">

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

      {/* SAFE CENTER COMPOSER BUTTON */}
      <Link
        href="/compose"
        className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-500 transition"
      >
        <PlusIcon className="w-6 h-6 text-white" />
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
