"use client";

import Image from "next/image";

export default function Avatar({
  src,
  size = 48,
  alt = "User avatar",
  className = "",
}: {
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const fallback = "/fallback-avatar.png"; // ⭐ Place this in /public

  return (
    <Image
      src={src || fallback}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }}
    />
  );
}
