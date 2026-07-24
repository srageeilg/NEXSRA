"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusinessProfile, useUpdateBusinessProfile, type BusinessProfile } from "@/hooks/use-settings";
import { WORLD_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type FormValues = Pick<
  BusinessProfile,
  "name" | "phone" | "address" | "website" | "currency" | "timezone" | "invoicePrefix"
>;

export function BusinessProfileForm() {
  const { data: profile, isLoading } = useBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const { register, handleSubmit, reset, control, watch } = useForm<FormValues>();
  const [currencySearch, setCurrencySearch] = useState("");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const selectedCurrency = watch("currency");
  const [taxIdType, setTaxIdType] = useState<"PAN" | "VAT">("PAN");
  const [taxIdNumber, setTaxIdNumber] = useState("");

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        website: profile.website ?? "",
        currency: profile.currency,
        timezone: profile.timezone,
        invoicePrefix: profile.invoicePrefix,
      });
      if (profile.vatNumber && !profile.panNumber) {
        setTaxIdType("VAT");
        setTaxIdNumber(profile.vatNumber);
      } else {
        setTaxIdType("PAN");
        setTaxIdNumber(profile.panNumber ?? "");
      }
    }
  }, [profile, reset]);

  const filtered = WORLD_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase()),
  );

  const selectedLabel = WORLD_CURRENCIES.find((c) => c.code === selectedCurrency);

  if (isLoading || !profile) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) =>
            updateProfile.mutate({
              ...values,
              panNumber: taxIdType === "PAN" ? taxIdNumber : "",
              vatNumber: taxIdType === "VAT" ? taxIdNumber : "",
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register("website")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Currency — searchable dropdown */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCurrencyOpen((v) => !v)}
                      className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <span>
                        {selectedLabel ? (
                          <span>
                            <span className="font-medium">{selectedLabel.code}</span>
                            <span className="ml-1.5 text-muted-foreground">{selectedLabel.symbol}</span>
                          </span>
                        ) : (
                          "Select currency"
                        )}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    {currencyOpen && (
                      <div className="absolute left-0 top-11 z-50 w-72 rounded-lg border bg-popover shadow-lg">
                        <div className="p-2">
                          <input
                            autoFocus
                            placeholder="Search currency…"
                            value={currencySearch}
                            onChange={(e) => setCurrencySearch(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        <ul className="max-h-56 overflow-y-auto p-1">
                          {filtered.length === 0 && (
                            <li className="py-4 text-center text-sm text-muted-foreground">No currencies found</li>
                          )}
                          {filtered.map((c) => (
                            <li key={c.code}>
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(c.code);
                                  setCurrencyOpen(false);
                                  setCurrencySearch("");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                                  field.value === c.code && "bg-primary/10 text-primary",
                                )}
                              >
                                <Check
                                  className={cn("h-3.5 w-3.5 shrink-0", field.value === c.code ? "opacity-100" : "opacity-0")}
                                />
                                <span className="font-medium w-10">{c.code}</span>
                                <span className="text-muted-foreground truncate">{c.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{c.symbol}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...register("timezone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice prefix</Label>
              <Input id="invoicePrefix" {...register("invoicePrefix")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tax ID type</Label>
              <Select value={taxIdType} onValueChange={(v) => setTaxIdType(v as "PAN" | "VAT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAN">PAN</SelectItem>
                  <SelectItem value="VAT">VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxIdNumber">{taxIdType} number</Label>
              <Input
                id="taxIdNumber"
                placeholder={taxIdType === "PAN" ? "e.g. 123456789" : "e.g. 987654321"}
                value={taxIdNumber}
                onChange={(e) => setTaxIdNumber(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Choose whichever your business is registered under — it's printed on tax invoices you generate from NEXSRA.
          </p>

          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
