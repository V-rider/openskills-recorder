"use client";

import Image from "next/image";
import { artifactUrl } from "@/lib/desktop-bridge";

export function ScreenshotThumb({
  path,
  alt,
  className,
}: {
  path?: string;
  alt?: string;
  className?: string;
}) {
  const url = path ? artifactUrl(path) : null;
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={alt ?? "Step screenshot"}
      width={320}
      height={180}
      unoptimized
      className={
        className ??
        "mt-2 h-16 w-auto rounded border border-zinc-200 object-cover dark:border-zinc-700"
      }
    />
  );
}
