import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/hooks/use-dashboard";

const STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  SENT: "bg-primary/10 text-primary",
  OVERDUE: "bg-destructive/10 text-destructive",
  PARTIALLY_PAID: "bg-warning/10 text-warning",
  INBOUND: "bg-success/10 text-success",
  OUTBOUND: "bg-muted text-muted-foreground",
};

export function RecentTransactions({ items }: { items: DashboardSummary["recentTransactions"] }) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        {items.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{tx.label}</p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASSES[tx.status] ?? "bg-muted")}>
                {tx.status.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(tx.amount)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
