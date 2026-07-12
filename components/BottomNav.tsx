"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MusicalNoteIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function BottomNav() {
  const pathname = usePathname() ?? ""; // ⭐ FIXED — never null

  const navItems = [
    { href: "/plaza", icon: HomeIcon, label: "Plaza" },
    { href: "/sound-square", icon: MusicalNoteIcon, label: "Sound" },
    { href: "/vision-square", icon: PhotoIcon, label: "Vision" },
    { href: "/messenger", icon: ChatBubbleLeftRightIcon, label: "Chat" },
    { href: "/profile/me", icon: UserCircleIcon, label: "Profile" },
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-white border-t border-gray-200
      flex justify-around items-center
      py-2 z-[9000]
    ">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1"
          >
            <Icon
              className={`
                w-6 h-6
                ${active ? "text-purple-600" : "text-gray-600"}
              `}
            />
            <span className={`
              text-xs
              ${active ? "text-purple-600 font-medium" : "text-gray-600"}
            `}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
