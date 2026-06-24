"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const navItems = [
    { label: "SoundSquare", href: "/sound-square/feed", prefetch: false },
    { label: "VisionSquare", href: "/vision", prefetch: false },
    { label: "SpiritSquare", href: "/spirit", prefetch: false },
    { label: "Shrine", href: "/shrine", prefetch: false },

    // ⭐ Prefetch disabled to prevent stale /profile/undefined
    user
      ? { label: "Profile", href: `/profile/${user.id}`, prefetch: false }
      : { label: "Profile", href: "/login", prefetch: false },

    { label: "Settings", href: "/settings", prefetch: false },
  ];

  return (
    <div
      suppressHydrationWarning
      className="
        fixed left-0 top-0 h-full w-[120px]
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
          const active = pathname?.startsWith(item.href) ?? false;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className={`
                px-3 py-2 rounded-lg transition-all
                ${active
                  ? "bg-purple-600/20 text-purple-200 font-semibold"
                  : "hover:bg-purple-500/10"
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
