import { Event2ActLogo } from "@/components/brand/Event2ActLogo";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return <Event2ActLogo variant="icon" className={className} width={32} height={32} />;
}
