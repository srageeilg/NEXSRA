import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/hooks/use-dashboard";

export function TopProducts({ items }: { items: DashboardSummary["topSellingProducts"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top selling products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No sales recorded yet.</p>}
        {items.map((item, idx) => (
          <div key={item.product?.id ?? idx} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-medium">
                {idx + 1}
              </span>
              <div>
                <p className="text-sm font-medium leading-none">{item.product?.name ?? "Unknown product"}</p>
                <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatCurrency(item.revenue)}</p>
              <p className="text-xs text-muted-foreground">{item.quantitySold} sold</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
