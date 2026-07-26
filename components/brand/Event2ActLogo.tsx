import Image from "next/image";
import { BRAND, type BrandLogoVariant } from "@/constants/brand";
import { cn } from "@/lib/utils";

const VARIANT_CONFIG: Record<BrandLogoVariant, { src: string; width: number; height: number; alt: string }> = {
  primary: { src: BRAND.assets.primaryLogo, width: 498, height: 172, alt: "Event2Act logo" },
  dark: { src: BRAND.assets.darkLogo, width: 3000, height: 765, alt: "Event2Act logo" },
  light: { src: BRAND.assets.lightLogo, width: 465, height: 146, alt: "Event2Act logo" },
  compact: { src: BRAND.assets.compactLogo, width: 432, height: 119, alt: "Event2Act logo" },
  stacked: { src: BRAND.assets.stackedLogo, width: 219, height: 143, alt: "Event2Act logo" },
  sidebar: { src: BRAND.assets.sidebarLogo, width: 293, height: 82, alt: "Event2Act logo" },
  report: { src: BRAND.assets.reportLogo, width: 327, height: 73, alt: "Event2Act logo" },
  email: { src: BRAND.assets.emailLogo, width: 281, height: 66, alt: "Event2Act logo" },
  icon: { src: BRAND.assets.icon, width: 512, height: 512, alt: "Event2Act app icon" },
};

interface Event2ActLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  alt?: string;
}

export function Event2ActLogo({
  variant = "primary",
  className,
  priority = false,
  width,
  height,
  sizes,
  alt,
}: Event2ActLogoProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <Image
      src={config.src}
      alt={alt ?? config.alt}
      width={width ?? config.width}
      height={height ?? config.height}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={cn("block h-auto max-w-full object-contain", className)}
    />
  );
}
