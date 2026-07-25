import type { MetadataRoute } from "next";
import { EVENT2ACT_LOGO_SRC } from "@/lib/brand-assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Event2Act AI - Inventory Intelligence",
    short_name: "Event2Act",
    description:
      "Turn inventory spreadsheets into operational dashboards, executive insights, and replenishment actions.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: EVENT2ACT_LOGO_SRC,
        sizes: "1536x1024",
        type: "image/png",
      },
    ],
  };
}
