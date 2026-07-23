"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-config";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const businessName = user?.business?.name ?? "Your business";
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "?";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Logo width={160} height={48} className="h-11 w-auto object-contain" priority />
      </div>

      <button className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-foreground/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-sidebar-foreground/[0.06]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-semibold text-primary">
          {businessName[0]?.toUpperCase() ?? "B"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40">Workspace</p>
          <p className="truncate text-sm font-medium text-sidebar-foreground">{businessName}</p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
      </button>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-foreground/50 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-sidebar-foreground/[0.06]">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/40">{user?.email}</p>
          </div>
          <Plus className="h-3.5 w-3.5 shrink-0 rotate-45 text-sidebar-foreground/30" />
        </button>
      </div>
    </aside>
  );
}
