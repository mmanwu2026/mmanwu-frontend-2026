"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "SoundSquare", href: "/sound-square/feed" },
    { label: "VisionSquare", href: "/vision" },
    { label: "SpiritSquare", href: "/spirit" },
    { label: "Shrine", href: "/shrine" },
    { label: "Profile", href: "/profile/me" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <div
      className="
        fixed
        left-0
        top-0
        h-full
        w-[120px]          /* Slimmer sidebar */
        bg-black           /* Removes border line */
        text-gray-300
        flex flex-col
        px-4
        pt-48             /* Push Navigation DOWN */
        z-[3000]
      "
    >
      <h2 className="text-lg font-semibold text-purple-200 mb-6">
        Navigation
      </h2>

      <div className="flex flex-col space-y-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
