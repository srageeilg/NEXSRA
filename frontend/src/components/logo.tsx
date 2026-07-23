"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/** Renders the light-background NEXSRA logo in light mode and the dark-background
 * variant in dark mode. Waits for next-themes to resolve on the client to avoid a
 * hydration mismatch, showing the light logo (the default theme) until then. */
export function Logo({ width = 120, height = 36, className, priority }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <Image
      src={src}
      alt="NEXSRA"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
