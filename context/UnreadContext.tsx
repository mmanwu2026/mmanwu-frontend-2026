"use client";

import { createContext, useContext, useState } from "react";

export type UnreadContextType = {
  unreadCounts: Record<string, number>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

const UnreadContext = createContext<UnreadContextType | null>(null);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  return (
    <UnreadContext.Provider value={{ unreadCounts, setUnreadCounts }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used inside UnreadProvider");
  return ctx;
}
