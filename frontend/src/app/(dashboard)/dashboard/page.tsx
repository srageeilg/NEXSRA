"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  IndianRupee,
  Euro,
  PoundSterling,
  Banknote,
  TrendingUp,
  Package,
  AlertTriangle,
  ClipboardList,
  Truck,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Paid", variant: "default" },
  SENT: { label: "Sent", variant: "secondary" },
  PARTIALLY_PAID: { label: "Partial", variant: "outline" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "secondary" },
  INBOUND: { label: "Received", variant: "default" },
  OUTBOUND: { label: "Sent", variant: "outline" },
};

const DONUT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

function getCurrencyIcon(currency?: string) {
  switch (currency) {
    case "NPR":
    case "INR":
      return IndianRupee;
    case "EUR":
      return Euro;
    case "GBP":
      return PoundSterling;
    case "USD":
      return DollarSign;
    default:
      return Banknote;
  }
}

const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <motion.div variants={fade}>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "font-bold tracking-tight",
                  value.length > 16 ? "text-lg" : value.length > 11 ? "text-xl" : "text-2xl",
                )}
                title={value}
              >
                {value}
              </p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  // Capture currency once per render — avoids calling getState() on every chart tick
  const currency = useAuthStore((s) => s.currency);
  const user = useAuthStore((s) => s.user);

  if (isError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load dashboard data</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const donutData = data.topSellingProducts
    .filter((p) => p.quantitySold > 0)
    .slice(0, 5)
    .map((p) => ({
      name: p.product?.name ?? "Unknown",
      value: p.quantitySold,
    }));

  const profitData = data.monthlyProfit.map((m) => ({
    month: m.month,
    Revenue: m.revenue,
    Cost: m.revenue - m.profit,
  }));

  const recentInvoices = data.recentTransactions.filter((t) => t.type === "INVOICE").slice(0, 8);
  const recentPayments = data.recentTransactions.filter((t) => t.type === "PAYMENT").slice(0, 5);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fade} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.firstName ? `Welcome back, ${user.firstName}` : "Dashboard"}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(data.lowStockCount > 0 || data.outOfStockCount > 0) && (
            <Link href="/inventory">
              <Badge
                variant="destructive"
                className="gap-1 cursor-pointer transition-opacity hover:opacity-80"
              >
                <AlertTriangle className="h-3 w-3" />
                {data.lowStockCount + data.outOfStockCount} stock alerts
              </Badge>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(data.todaySales)}
          sub="Revenue today"
          icon={getCurrencyIcon(currency)}
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(data.monthRevenue)}
          sub="This month"
          icon={TrendingUp}
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Monthly Profit"
          value={formatCurrency(data.monthProfit)}
          sub="This month"
          icon={TrendingUp}
          colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          sub="Total stock"
          icon={Package}
          colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Low Stock"
          value={String(data.lowStockCount)}
          sub={`${data.outOfStockCount} out of stock`}
          icon={AlertTriangle}
          colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          label="Pending Orders"
          value={String(data.pendingOrders)}
          sub={`${data.purchaseOrdersOpen} purchase orders`}
          icon={ClipboardList}
          colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* Charts Row 1 */}
      <motion.div variants={fade} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue vs Cost grouped bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue vs Cost (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={profitData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((_, index) => (
                      <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [`${v} units`, "Sold"]}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                    formatter={(value: string) => (value.length > 14 ? value.slice(0, 14) + "…" : value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div variants={fade} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesChart data={data.salesGraph} />
        <ProfitChart data={data.monthlyProfit} />
      </motion.div>

      {/* Data Row */}
      <motion.div variants={fade} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Invoices Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Invoice</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No invoices yet
                      </td>
                    </tr>
                  )}
                  {recentInvoices.map((tx) => {
                    const cfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, variant: "secondary" as const };
                    return (
                      <tr key={tx.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <p className="max-w-[140px] truncate font-medium">{tx.label}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant={cfg.variant} className="text-xs">
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <StockAlerts items={data.lowStockItems ?? []} outOfStockCount={data.outOfStockCount} />
      </motion.div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <motion.div variants={fade}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentPayments.map((tx) => {
                  const cfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, variant: "secondary" as const };
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tx.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={cfg.variant} className="text-xs">
                          {cfg.label}
                        </Badge>
                        <span className="text-sm font-semibold">{formatCurrency(tx.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
