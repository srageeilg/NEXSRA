"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, type Product } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useCustomers } from "@/hooks/use-customers";
import { usePosCheckout, type CartItem } from "@/hooks/use-sales";
import { downloadInvoicePdf } from "@/hooks/use-invoices";
import { formatCurrency } from "@/lib/utils";

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

  const { data: productsData, isLoading: productsLoading } = useProducts({ search: search || undefined, pageSize: 30, isActive: true });
  const { data: warehouses } = useWarehouses();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const checkout = usePosCheckout();

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

  const removeLine = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  const subTotal = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), [cart]);

  const handleCheckout = () => {
    if (!warehouseId || cart.length === 0) return;
    checkout.mutate(
      {
        warehouseId,
        customerId,
        items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        payments: [{ method: paymentMethod, amount: subTotal }],
      },
      {
        onSuccess: (data) => {
          setCart([]);
          downloadInvoicePdf(data.data.invoice.id, data.data.invoice.invoiceNumber);
        },
      },
    );
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
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
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

          <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(subTotal)}</span>
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
    </div>
  );
}
