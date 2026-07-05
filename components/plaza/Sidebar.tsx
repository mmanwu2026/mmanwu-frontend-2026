"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";

import {
  MusicalNoteIcon,
  PhotoIcon,
  SparklesIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const { user } = useUser();
  const supabase = useSupabase();

  // ⭐ UNREAD COUNTS
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // ⭐ LOAD UNREAD COUNTS
 useEffect(() => {
  if (!user) return;

  async function loadUnread() {
    if (!user) return;
    const userId = user.id;

    const { data } = await supabase
      .from("messages")
      .select("room_id")
      .neq("sender_id", userId)
      .is("seen_at", null);

    const counts: Record<string, number> = {};

    data?.forEach((m: { room_id: string }) => {
      counts[m.room_id] = (counts[m.room_id] || 0) + 1;
    });

    setUnreadCounts(counts);
  }

  loadUnread();
}, [user, supabase]);

  // ⭐ REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("sidebar-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: any }) => {
          const msg = payload.new;

          if (msg.sender_id === user.id) return;
          if (msg.seen_at !== null) return;

          setUnreadCounts((prev) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // ⭐ TOTAL UNREAD
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

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

    // ⭐ Messenger with badge
    {
      label: "Messenger",
      href: "/messenger",
      icon: ChatBubbleLeftRightIcon,
      badge: totalUnread,
    },

    user
      ? { label: "Profile", href: `/profile/${user.id}`, icon: UserCircleIcon }
      : { label: "Profile", href: "/login", icon: UserCircleIcon },

    { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
  ];

  return (
    <div
      suppressHydrationWarning
      className="
        fixed left-0 top-0 h-full w-[88px]
        bg-black text-gray-300 flex flex-col
        px-2 pt-[200px] z-[3000]
      "
    >
      <h2 className="text-[11px] font-semibold text-purple-200 mb-3">
        Navigation
      </h2>

      <div className="flex flex-col space-y-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="flex flex-col space-y-1">
              <Link
                href={item.href}
                className={`
                  px-1.5 py-1 rounded-md transition-all flex items-center gap-1
                  text-[11px]
                  ${
                    active
                      ? "bg-purple-600/25 text-purple-200 font-semibold"
                      : "hover:bg-purple-500/15"
                  }
                `}
              >
                <Icon
                  className="
                    h-4 w-4 
                    scale-[0.55] 
                    transform origin-center 
                    text-purple-300 
                    shrink-0
                  "
                />

                <span className="truncate">{item.label}</span>

                {/* ⭐ UNREAD BADGE */}
                {(item.badge ?? 0) > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-[9px] rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>

              {item.children && active && (
                <div className="ml-4 flex flex-col space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          text-[10px] px-2 py-0.5 rounded transition-all
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
