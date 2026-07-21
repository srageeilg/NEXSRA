"use client";

import { useState } from "react";
import { Search, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { ViewCustomerDialog } from "@/components/customers/view-customer-dialog";
import { useCustomers, useDeactivateCustomer, Customer } from "@/hooks/use-customers";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomers({ pageSize: 20, search: search || undefined });
  const deactivate = useDeactivateCustomer();

  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Buyers, their credit limits, and outstanding balances.</p>
        </div>
        <CreateCustomerDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Credit limit</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Loyalty pts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No customers yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewCustomer(c)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone ?? c.email ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(c.creditLimit)}</TableCell>
                    <TableCell>
                      <span className={parseFloat(c.outstandingBalance) > 0 ? "font-medium text-destructive" : "font-medium"}>
                        {formatCurrency(c.outstandingBalance)}
                      </span>
                    </TableCell>
                    <TableCell>{c.loyaltyPoints}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "success" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewCustomer(c)}>View details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditCustomer(c)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deactivate.mutate(c.id)}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ViewCustomerDialog
        customer={viewCustomer}
        open={!!viewCustomer}
        onOpenChange={(o) => { if (!o) setViewCustomer(null); }}
      />

      {editCustomer && (
        <EditCustomerDialog
          customer={editCustomer}
          open={!!editCustomer}
          onOpenChange={(o) => { if (!o) setEditCustomer(null); }}
        />
      )}
    </div>
  );
}
