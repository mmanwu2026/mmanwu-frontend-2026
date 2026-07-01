"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

import {
  MusicalNoteIcon,
  PhotoIcon,
  SparklesIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const { user } = useUser();

  const navItems = [
    {
      label: "SoundSquare",
      href: "/sound-square/feed",
      icon: MusicalNoteIcon,
      children: [
        { label: "Feed", href: "/sound-square/feed" },
        { label: "Upload Sound", href: "/sound-square/create" },
        { label: "Trending", href: "/sound-square/trending" },
      ],
    },
    {
      label: "VisionSquare",
      href: "/vision-square/feed",
      icon: PhotoIcon,
      children: [
        { label: "Feed", href: "/vision-square/feed" },
        { label: "Upload Vision", href: "/vision-square/create" },
        { label: "Trending", href: "/vision-square/trending" },
      ],
    },
    { label: "SpiritSquare", href: "/spirit", icon: SparklesIcon },
    { label: "Shrine", href: "/shrine", icon: FireIcon },
    { label: "Messenger", href: "/messenger", icon: ChatBubbleLeftRightIcon },
    user
      ? { label: "Profile", href: `/profile/${user.id}`, icon: UserCircleIcon }
      : { label: "Profile", href: "/login", icon: UserCircleIcon },
    { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
  ];

  return (
    <div
      suppressHydrationWarning
      className="
        fixed left-0 top-0 h-full w-[110px]
        bg-black text-gray-300 flex flex-col
        px-3 pt-[260px] z-[3000]
      "
    >
      <h2 className="text-sm font-semibold text-purple-200 mb-4">
        Navigation
      </h2>

      <div className="flex flex-col space-y-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="flex flex-col space-y-1">
              <Link
  href={item.href}
  className={`
    px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5
    text-xs
    ${
      active
        ? "bg-purple-600/20 text-purple-200 font-semibold"
        : "hover:bg-purple-500/10"
    }
  `}
>
  <Icon className="h-4 w-4 text-purple-300/70 shrink-0" />
  <span>{item.label}</span>
</Link>

              {item.children && active && (
                <div className="ml-5 flex flex-col space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          text-xs px-2 py-1 rounded transition-all
                          ${
                            childActive
                              ? "text-purple-300 font-semibold"
                              : "text-gray-400 hover:text-purple-200"
                          }
                        `}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
