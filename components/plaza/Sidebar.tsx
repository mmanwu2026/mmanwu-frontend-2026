"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

// Import Heroicons (this path works with pnpm + Next.js)
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

    // ⭐ Messenger added with icon
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
        fixed left-0 top-0 h-full w-[140px]
        bg-black text-gray-300 flex flex-col
        px-4 pt-[352px] z-[3000] pointer-events-auto
        [backface-visibility:hidden] [transform:translateZ(0)]
      "
    >
      <h2 className="text-lg font-semibold text-purple-200 mb-6">
        Navigation
      </h2>

      <div className="flex flex-col space-y-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="flex flex-col space-y-1">
              <Link
                href={item.href}
                className={`
                  px-3 py-2 rounded-lg transition-all flex items-center gap-2
                  ${
                    active
                      ? "bg-purple-600/20 text-purple-200 font-semibold"
                      : "hover:bg-purple-500/10"
                  }
                `}
              >
                <Icon className="h-5 w-5 text-purple-300" />
                {item.label}
              </Link>

              {/* ⭐ Sub-links for SoundSquare & VisionSquare */}
              {item.children && active && (
                <div className="ml-6 flex flex-col space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          text-sm px-2 py-1 rounded transition-all
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
