"use client";

import { type LucideIcon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "primary" | "success" | "warning" | "destructive";
  sparkline?: number[];
  highlight?: boolean;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function KpiCard({ label, value, icon: Icon, trend, accent = "primary", sparkline, highlight }: KpiCardProps) {
  if (highlight) {
    return (
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-lg">
        <CardContent className="flex items-start justify-between p-5">
          <div className="space-y-1.5">
            <p className="text-sm text-white/80">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs font-medium text-white/90">
                {trend.positive ? "▲" : "▼"} {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </p>
          )}
        </div>

        {sparkline && sparkline.length > 1 ? (
          <div className="h-10 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sparkline.map((value) => ({ value }))} barGap={2}>
                <Bar dataKey="value" radius={[2, 2, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", ACCENT_CLASSES[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
