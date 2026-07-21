"use client";

import { useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCreateJournalEntry } from "@/hooks/use-accounting";

interface FormValues {
  description: string;
  lines: { accountId: string; type: "DEBIT" | "CREDIT"; amount: number }[];
}

export function CreateJournalEntryDialog() {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const createEntry = useCreateJournalEntry();

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: {
      lines: [
        { accountId: "", type: "DEBIT", amount: 0 },
        { accountId: "", type: "CREDIT", amount: 0 },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const onSubmit = (values: FormValues) => {
    createEntry.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New journal entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New journal entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="e.g. Owner capital injection" {...register("description", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>Lines (debits must equal credits)</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_100px_100px_32px] items-center gap-2">
                <Controller
                  control={control}
                  name={`lines.${index}.accountId`}
                  rules={{ required: true }}
                  render={({ field: selectField }) => (
                    <Select onValueChange={selectField.onChange} value={selectField.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name={`lines.${index}.type`}
                  render={({ field: selectField }) => (
                    <Select onValueChange={selectField.onChange} value={selectField.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  {...register(`lines.${index}.amount`, { required: true, valueAsNumber: true })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: "", type: "DEBIT", amount: 0 })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? "Saving..." : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
