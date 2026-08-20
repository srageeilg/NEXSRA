"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Truck, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProducts, type Product } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useCustomers } from "@/hooks/use-customers";
import { usePosCheckout, type CartItem, type CheckoutInvoice } from "@/hooks/use-sales";
import { downloadInvoicePdf } from "@/hooks/use-invoices";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const VCTS_LOGIN_URL = "https://vctsdri.dri.gov.np/login";
const VAT_RATE = 0.13;

interface CartLine extends CartItem {
  name: string;
  sku: string;
}

export default function PosPage() {
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>();
  const [customerId, setCustomerId] = useState<string>();
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [requiresVcts, setRequiresVcts] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vctsInvoice, setVctsInvoice] = useState<CheckoutInvoice | null>(null);

  const { data: productsData, isLoading: productsLoading } = useProducts({ search: search || undefined, pageSize: 30, isActive: true });
  const { data: warehouses } = useWarehouses();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const checkout = usePosCheckout();

  // Default to the business's primary warehouse so cashiers don't have to pick it every sale.
  useEffect(() => {
    if (!warehouseId && warehouses && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouseId, warehouses]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, sku: product.sku, quantity: 1, unitPrice: Number(product.sellingPrice) },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const removeLine = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  const subTotal = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), [cart]);
  const vatTotal = useMemo(() => subTotal * VAT_RATE, [subTotal]);
  const grandTotal = subTotal + vatTotal;

  const handleCheckout = () => {
    if (!warehouseId || cart.length === 0) return;
    if (requiresVcts && !vehicleNumber.trim()) {
      toast.error("Enter the vehicle number for the VCTS bill");
      return;
    }
    checkout.mutate(
      {
        warehouseId,
        customerId,
        items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice, taxRate: VAT_RATE })),
        payments: [{ method: paymentMethod, amount: grandTotal }],
        requiresVcts,
        vehicleNumber: requiresVcts ? vehicleNumber.trim() : undefined,
      },
      {
        onSuccess: (data) => {
          setCart([]);
          downloadInvoicePdf(data.data.invoice.id, data.data.invoice.invoiceNumber);
          if (data.data.invoice.requiresVcts) {
            setVctsInvoice(data.data.invoice);
          }
          setRequiresVcts(false);
          setVehicleNumber("");
        },
      },
    );
  };

  const vctsSummary = useMemo(() => {
    if (!vctsInvoice) return "";
    const lines = [
      `Invoice: ${vctsInvoice.invoiceNumber}`,
      `Vehicle number: ${vctsInvoice.vehicleNumber ?? ""}`,
      `Customer: ${vctsInvoice.customer?.name ?? "Walk-in"}`,
      `Customer PAN: ${vctsInvoice.customer?.panNumber ?? "N/A"}`,
      `Total amount: ${vctsInvoice.grandTotal}`,
      "Items:",
      ...vctsInvoice.items.map(
        (i) => `  - ${i.product.name} (${i.product.sku}) x${i.quantity} @ ${i.unitPrice} = ${i.total}`,
      ),
    ];
    return lines.join("\n");
  }, [vctsInvoice]);

  const copyVctsSummary = async () => {
    await navigator.clipboard.writeText(vctsSummary);
    toast.success("Bill details copied — paste them into the VCTS form");
  };

  const openVctsPortal = () => {
    window.open(VCTS_LOGIN_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Search products and add them to the cart to check out.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {productsData?.data.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => addToCart(product)}
              >
                <CardContent className="space-y-1 p-4">
                  <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                  <p className="font-semibold text-primary">{formatCurrency(product.sellingPrice)}</p>
                  <p className="text-xs text-muted-foreground">{product.totalStock} in stock</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="flex h-fit flex-col lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Cart ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select onValueChange={setWarehouseId} value={warehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Customer (optional)</Label>
            <Select onValueChange={(v) => setCustomerId(v === "__walkin__" ? undefined : v)} value={customerId ?? "__walkin__"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__walkin__">Walk-in customer</SelectItem>
                {customersData?.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {cart.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Cart is empty</p>}
            {cart.map((line) => (
              <div key={line.productId} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(line.productId, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next)) setQuantity(line.productId, Math.max(0, Math.floor(next)));
                    }}
                    className="h-6 w-12 px-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(line.productId, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeLine(line.productId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="MOBILE_WALLET">Mobile wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="vcts-toggle" className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4" />
                Dispatch by vehicle (VCTS required)
              </Label>
              <Switch id="vcts-toggle" checked={requiresVcts} onCheckedChange={setRequiresVcts} />
            </div>
            {requiresVcts && (
              <Input
                placeholder="Vehicle number (e.g. BA 2 KHA 1234)"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>VAT ({VAT_RATE * 100}%)</span>
              <span>{formatCurrency(vatTotal)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || !warehouseId || checkout.isPending}
            onClick={handleCheckout}
          >
            {checkout.isPending ? "Processing..." : "Complete sale"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!vctsInvoice} onOpenChange={(o) => !o && setVctsInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              VCTS bill required
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This sale is being dispatched by vehicle. NEXSRA does not have official API access to VCTS
            (vctsdri.dri.gov.np), so you&apos;ll need to log in and file the bill yourself — copy these
            details below to paste into the VCTS form.
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs">
            {vctsSummary}
          </pre>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={copyVctsSummary}>
              <Copy className="mr-2 h-4 w-4" />
              Copy details
            </Button>
            <Button onClick={openVctsPortal}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open VCTS portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
