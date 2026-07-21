"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog";
import { useExpenses, useUpdateExpenseStatus } from "@/hooks/use-expenses";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  PAID: "success",
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
};

export default function ExpensesPage() {
  const { data, isLoading } = useExpenses({ pageSize: 30 });
  const updateStatus = useUpdateExpenseStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and approve business expenses by category.</p>
        </div>
        <CreateExpenseDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No expenses recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>{expense.category.name}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.submittedBy ? `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[expense.status]}>{expense.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {expense.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: expense.id, status: "APPROVED" })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => updateStatus.mutate({ id: expense.id, status: "REJECTED" })}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {expense.status === "APPROVED" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: expense.id, status: "PAID" })}>
                          Mark paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
