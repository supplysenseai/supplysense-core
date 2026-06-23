"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-loader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Allow through if logged in OR running in demo mode
    if (!getAuth() && !isDemoMode()) {
      router.replace("/login");
    }
  }, [router]);

  return <>{children}</>;
}
