"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
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

interface RoomParticipant {
  room_id: string;
  last_seen: string | null;
}

interface Message {
  room_id: string;
  created_at: string;
  message_type: string;
  sender_id: string;
}

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadUnread() {
      if (!uid) return;

      const { data: rooms } = await supabase
        .from("room_participants")
        .select("room_id, last_seen")
        .eq("user_id", uid);

      if (!rooms) return;

      const typedRooms = rooms as RoomParticipant[];
      const roomIds = typedRooms.map((r) => r.room_id);

      const { data: messages } = await supabase
        .from("messages")
        .select("room_id, created_at, message_type, sender_id")
        .in("room_id", roomIds)
        .in("message_type", ["text", "image", "audio"]);

      const typedMessages = (messages ?? []) as Message[];

      const counts: Record<string, number> = {};

      typedMessages.forEach((m) => {
        const participant = typedRooms.find((r) => r.room_id === m.room_id);
        if (!participant) return;

        const lastSeen = new Date(participant.last_seen || 0);

        if (m.sender_id !== uid && new Date(m.created_at) > lastSeen) {
          counts[m.room_id] = (counts[m.room_id] || 0) + 1;
        }
      });

      setUnreadCounts(counts);
    }

    loadUnread();
  }, [uid, supabase]);

  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel("sidebar-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: Message }) => {
          const msg = payload.new;

          if (msg.sender_id === uid) return;
          if (!["text", "image", "audio"].includes(msg.message_type)) return;

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
  }, [uid, supabase]);

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
    {
      label: "Messenger",
      href: "/messenger",
      icon: ChatBubbleLeftRightIcon,
      badge: totalUnread,
    },
    uid
      ? { label: "Profile", href: `/profile/${uid}`, icon: UserCircleIcon }
      : { label: "Profile", href: "/login", icon: UserCircleIcon },
    { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
  ];

  return (
    <div
      suppressHydrationWarning
      className="
        fixed left-0 top-0 h-full w-[88px]
        bg-white border-r border-gray-200
        text-gray-700 flex flex-col
        px-2 pt-24 z-[3000]
      "
    >
      <h2 className="text-[11px] font-semibold text-gray-600 mb-3">
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
                      ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                      : "hover:bg-gray-100"
                  }
                `}
              >
                <Icon
                  className="
                    h-4 w-4 
                    text-blue-500 
                    shrink-0
                  "
                />

                <span className="truncate">{item.label}</span>

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
                              ? "text-blue-700 font-semibold"
                              : "text-gray-500 hover:text-blue-600"
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
