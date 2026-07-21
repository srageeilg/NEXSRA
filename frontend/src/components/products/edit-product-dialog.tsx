"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useBrands, useUnits, useCreateBrand, useCreateCategory, Brand, Category } from "@/hooks/use-catalog";
import { useUpdateProduct, Product } from "@/hooks/use-products";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function InlineCombobox({
  items,
  value,
  onChange,
  onCreateLabel,
  onCreate,
  creating,
}: {
  items: { id: string; name: string }[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
  onCreateLabel: string;
  onCreate: (name: string, cb: (id: string) => void) => void;
  creating: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = items?.find((i) => i.id === value)?.name ?? "";

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = (items ?? []).filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate =
    query.trim().length > 0 && !filtered.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="None"
        value={open ? query : selectedName}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No {onCreateLabel.toLowerCase()}s found</p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                {item.name}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-1.5 border-t px-3 py-1.5 text-left text-sm text-primary hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onCreate(query.trim(), (id) => { onChange(id); setOpen(false); })}
                disabled={creating}
              >
                <Plus className="h-3.5 w-3.5" />
                {creating ? "Creating..." : `Create "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({ product, open, onOpenChange }: Props) {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: units } = useUnits();
  const updateProduct = useUpdateProduct();
  const createBrand = useCreateBrand();
  const createCategory = useCreateCategory();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      categoryId: product.category?.id,
      brandId: product.brand?.id,
      unitId: product.unit?.id,
      purchasePrice: parseFloat(product.purchasePrice),
      sellingPrice: parseFloat(product.sellingPrice),
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: product.name,
        sku: product.sku,
        categoryId: product.category?.id,
        brandId: product.brand?.id,
        unitId: product.unit?.id,
        purchasePrice: parseFloat(product.purchasePrice),
        sellingPrice: parseFloat(product.sellingPrice),
        lowStockThreshold: product.lowStockThreshold,
        isActive: product.isActive,
      });
    }
  }, [open, product, reset]);

  const onSubmit = (values: FormValues) => {
    updateProduct.mutate({ id: product.id, ...values }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product name</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-sku">SKU</Label>
            <Input id="edit-sku" {...register("sku")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <InlineCombobox
                    items={categories}
                    value={field.value}
                    onChange={field.onChange}
                    onCreateLabel="Category"
                    onCreate={(name, cb) => createCategory.mutate({ name }, { onSuccess: (res) => cb(res.data.id) })}
                    creating={createCategory.isPending}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Controller
                control={control}
                name="brandId"
                render={({ field }) => (
                  <InlineCombobox
                    items={brands}
                    value={field.value}
                    onChange={field.onChange}
                    onCreateLabel="Brand"
                    onCreate={(name, cb) => createBrand.mutate({ name }, { onSuccess: (res) => cb(res.data.id) })}
                    creating={createBrand.isPending}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {units?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-purchasePrice">Purchase price</Label>
              <Input id="edit-purchasePrice" type="number" step="0.01" {...register("purchasePrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sellingPrice">Selling price</Label>
              <Input id="edit-sellingPrice" type="number" step="0.01" {...register("sellingPrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lowStockThreshold">Low stock alert</Label>
              <Input id="edit-lowStockThreshold" type="number" {...register("lowStockThreshold")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive products are hidden from sales &amp; POS.</p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
