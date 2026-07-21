"use client";

import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReport, downloadReportCsv, type ReportKind } from "@/hooks/use-reports";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SalesReport {
  totalRevenue: number;
  invoiceCount: number;
  rows: { invoiceNumber: string; date: string; customer: string; total: number }[];
}
interface PurchaseReport {
  totalSpend: number;
  orderCount: number;
  rows: { poNumber: string; date: string; supplier: string; status: string; total: number }[];
}
interface InventoryReport {
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  rows: { sku: string; name: string; quantity: number; valuation: number; status: string }[];
}
interface PartyReportRow {
  name: string;
  totalRevenue?: number;
  totalSpend?: number;
  outstandingBalance: number;
}
interface ExpenseReport {
  totalExpenses: number;
  rows: { category: string; total: number }[];
}

function ReportHeader({ title, kind }: { title: string; kind: ReportKind }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      <Button variant="outline" size="sm" onClick={() => downloadReportCsv(kind)}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  );
}

export default function ReportsPage() {
  const sales = useReport<SalesReport>("sales");
  const purchases = useReport<PurchaseReport>("purchases");
  const inventory = useReport<InventoryReport>("inventory");
  const customers = useReport<{ rows: PartyReportRow[] }>("customers");
  const suppliers = useReport<{ rows: PartyReportRow[] }>("suppliers");
  const expenses = useReport<ExpenseReport>("expenses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Sales, purchases, inventory, and financial reporting.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sales revenue (30d)</p>
            <p className="text-xl font-semibold">{sales.data ? formatCurrency(sales.data.totalRevenue) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Purchase spend (30d)</p>
            <p className="text-xl font-semibold">{purchases.data ? formatCurrency(purchases.data.totalSpend) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inventory value</p>
            <p className="text-xl font-semibold">{inventory.data ? formatCurrency(inventory.data.totalValuation) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expenses (30d)</p>
            <p className="text-xl font-semibold">{expenses.data ? formatCurrency(expenses.data.totalExpenses) : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <ReportHeader title="Sales report (last 30 days)" kind="sales" />
            </CardHeader>
            <CardContent>
              {!sales.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.data.rows.map((r) => (
                      <TableRow key={r.invoiceNumber}>
                        <TableCell className="font-mono text-sm">{r.invoiceNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
                        <TableCell>{r.customer}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(r.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <ReportHeader title="Purchase report (last 30 days)" kind="purchases" />
            </CardHeader>
            <CardContent>
              {!purchases.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.data.rows.map((r) => (
                      <TableRow key={r.poNumber}>
                        <TableCell className="font-mono text-sm">{r.poNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
                        <TableCell>{r.supplier}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(r.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <ReportHeader title="Inventory valuation" kind="inventory" />
            </CardHeader>
            <CardContent>
              {!inventory.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Valuation</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.data.rows.map((r) => (
                      <TableRow key={r.sku}>
                        <TableCell className="font-mono text-sm">{r.sku}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(r.valuation)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.status.replace(/_/g, " ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <ReportHeader title="Customer report" kind="customers" />
            </CardHeader>
            <CardContent>
              {!customers.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total revenue</TableHead>
                      <TableHead>Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.data.rows.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{formatCurrency(r.totalRevenue ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(r.outstandingBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <ReportHeader title="Supplier report" kind="suppliers" />
            </CardHeader>
            <CardContent>
              {!suppliers.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Total spend</TableHead>
                      <TableHead>Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.data.rows.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{formatCurrency(r.totalSpend ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(r.outstandingBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <ReportHeader title="Expenses by category" kind="expenses" />
            </CardHeader>
            <CardContent>
              {!expenses.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.data.rows.map((r) => (
                      <TableRow key={r.category}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell>{formatCurrency(r.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
