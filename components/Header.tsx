"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { user } = useUser();

  return (
    <header className="w-full flex justify-between items-center px-4 py-4 mb-6 bg-white shadow-sm">
      <Link href="/" className="text-xl font-bold text-black">
        Mman Plaza
      </Link>

      {user && (
        <Link
          href={`/creator/${user.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          My Profile
        </Link>
      )}
    </header>
  );
}
