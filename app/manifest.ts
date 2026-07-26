import type { MetadataRoute } from "next";
import { BRAND } from "@/constants/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.productName,
    short_name: BRAND.productName,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: BRAND.colors.white,
    theme_color: BRAND.colors.deepNavy,
    icons: [
      {
        src: BRAND.assets.android192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: BRAND.assets.android512,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
