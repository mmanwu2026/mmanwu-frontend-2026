"use client";

import Image from "next/image";
import { useState } from "react";

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
  const fallback = "/fallback-avatar.png";

  const [imgSrc, setImgSrc] = useState(src || fallback);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setImgSrc(fallback)}
    />
  );
}
