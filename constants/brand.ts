export const BRAND = {
  productName: "Event2Act",
  platformName: "Event2Act AI",
  moduleName: "Inventory Intelligence",
  shortName: "E2A",
  tagline: "Every Event. Intelligent Action.",
  description:
    "Event2Act transforms operational events into intelligent, actionable business decisions.",
  colors: {
    primaryBlue: "#2563EB",
    aiPurple: "#7C3AED",
    deepNavy: "#0F172A",
    slateGray: "#475569",
    lightGray: "#CBD5E1",
    white: "#FFFFFF",
  },
  assets: {
    primaryLogo: "/brand/event2act-logo.png",
    darkLogo: "/brand/event2act-logo-dark.png",
    lightLogo: "/brand/event2act-logo-light.png",
    compactLogo: "/brand/event2act-compact.png",
    stackedLogo: "/brand/event2act-stacked.png",
    sidebarLogo: "/brand/event2act-sidebar.png",
    reportLogo: "/brand/event2act-report.png",
    emailLogo: "/brand/event2act-email.png",
    icon: "/brand/event2act-icon.png",
    favicon16: "/brand/favicon-16.png",
    favicon32: "/brand/favicon-32.png",
    appleTouchIcon: "/brand/apple-touch-icon.png",
    android192: "/brand/android-chrome-192.png",
    android512: "/brand/android-chrome-512.png",
    microsoftTile: "/brand/mstile-150.png",
  },
} as const;

export type BrandLogoVariant =
  | "primary"
  | "dark"
  | "light"
  | "compact"
  | "stacked"
  | "sidebar"
  | "report"
  | "email"
  | "icon";
