"use client";

import { useState } from "react";
import { Search, MoreHorizontal, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { ViewProductSheet } from "@/components/products/view-product-sheet";
import { useProducts, useDeactivateProduct, Product } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProducts({ page, pageSize: 20, search: search || undefined });
  const deactivate = useDeactivateProduct();

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your product catalog, pricing and stock alerts.</p>
        </div>
        <CreateProductDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU or barcode..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No products found. Create your first product to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.data.map((product) => {
                    const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
                    const stockStatus =
                      product.totalStock === 0
                        ? { label: "Out of stock", variant: "destructive" as const }
                        : product.totalStock <= product.lowStockThreshold
                          ? { label: "Low stock", variant: "warning" as const }
                          : { label: "In stock", variant: "success" as const };

                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer"
                        onClick={() => setViewProduct(product)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                              {primaryImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={primaryImage.url} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                        <TableCell>{product.category?.name ?? "—"}</TableCell>
                        <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {product.totalStock} {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "success" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewProduct(product)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditProduct(product)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deactivate.mutate(product.id)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {data && data.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} products)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ViewProductSheet
        product={viewProduct}
        open={!!viewProduct}
        onOpenChange={(o) => { if (!o) setViewProduct(null); }}
      />

      <EditProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(o) => { if (!o) setEditProduct(null); }}
      />
    </div>
  );
}
