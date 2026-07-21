"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AiAssistant } from "@/components/dashboard/ai-assistant";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import { useBusinessProfile } from "@/hooks/use-settings";
import { useAuthStore } from "@/store/auth-store";

function CurrencySync() {
  const { data: profile } = useBusinessProfile();
  const setCurrency = useAuthStore((s) => s.setCurrency);
  useEffect(() => {
    if (profile?.currency) setCurrency(profile.currency);
  }, [profile?.currency, setCurrency]);
  return null;
}

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useSessionBootstrap();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {isHydrated ? (
            <>
              <CurrencySync />
              {children}
              <AiAssistant />
            </>
          ) : (
            <div className="animate-pulse text-sm text-muted-foreground">Loading workspace...</div>
          )}
        </main>
      </div>
    </div>
  );
}
