import { EVENT2ACT_LOGO_SRC } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src={EVENT2ACT_LOGO_SRC}
      alt="Event2Act"
      className={cn("block h-full w-full object-contain", className)}
    />
  );
}
