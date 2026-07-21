"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateAccountDialog } from "@/components/accounting/create-account-dialog";
import { CreateJournalEntryDialog } from "@/components/accounting/create-journal-entry-dialog";
import { useAccounts, useJournalEntries } from "@/hooks/use-accounting";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AccountingPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: journalData, isLoading: journalLoading } = useJournalEntries({ pageSize: 30 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
        <p className="text-sm text-muted-foreground">Chart of accounts and double-entry journal.</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Chart of accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal entries</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="mb-4 flex justify-end">
            <CreateAccountDialog />
          </div>
          <Card>
            <CardContent className="p-4">
              {accountsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          No accounts yet. Add your chart of accounts to start recording journal entries.
                        </TableCell>
                      </TableRow>
                    )}
                    {accounts?.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.code}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <div className="mb-4 flex justify-end">
            <CreateJournalEntryDialog />
          </div>
          <Card>
            <CardContent className="p-4">
              {journalLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {journalData?.data.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">No journal entries yet.</p>
                  )}
                  {journalData?.data.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</p>
                      </div>
                      <div className="space-y-1">
                        {entry.lines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {line.account.code} — {line.account.name}
                            </span>
                            <span className={line.type === "DEBIT" ? "text-foreground" : "text-primary"}>
                              {line.type === "DEBIT" ? "Dr" : "Cr"} {formatCurrency(line.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
