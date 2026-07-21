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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useBrands, useUnits, useCreateBrand, useCreateCategory, Brand, Category } from "@/hooks/use-catalog";
import { useCreateProduct } from "@/hooks/use-products";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface BrandComboboxProps {
  brands: Brand[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
}

function BrandCombobox({ brands, value, onChange }: BrandComboboxProps) {
  const createBrand = useCreateBrand();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = brands?.find((b) => b.id === value)?.name ?? "";

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = (brands ?? []).filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim().length > 0 && !filtered.some((b) => b.name.toLowerCase() === query.trim().toLowerCase());

  const handleSelect = (brand: Brand) => {
    onChange(brand.id);
    setOpen(false);
  };

  const handleCreate = () => {
    const name = query.trim();
    createBrand.mutate(
      { name },
      {
        onSuccess: (res) => {
          onChange(res.data.id);
          setOpen(false);
        },
      },
    );
  };

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
              <p className="px-3 py-2 text-xs text-muted-foreground">No brands found</p>
            )}
            {filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(b)}
              >
                {b.name}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-1.5 border-t px-3 py-1.5 text-left text-sm text-primary hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={createBrand.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                {createBrand.isPending ? "Creating..." : `Create "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryComboboxProps {
  categories: Category[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
}

function CategoryCombobox({ categories, value, onChange }: CategoryComboboxProps) {
  const createCategory = useCreateCategory();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = categories?.find((c) => c.id === value)?.name ?? "";

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = (categories ?? []).filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim().length > 0 && !filtered.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const handleCreate = () => {
    const name = query.trim();
    createCategory.mutate(
      { name },
      {
        onSuccess: (res) => {
          onChange(res.data.id);
          setOpen(false);
        },
      },
    );
  };

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
              <p className="px-3 py-2 text-xs text-muted-foreground">No categories found</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                {c.name}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-1.5 border-t px-3 py-1.5 text-left text-sm text-primary hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={createCategory.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                {createCategory.isPending ? "Creating..." : `Create "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { purchasePrice: 0, sellingPrice: 0, lowStockThreshold: 10, isActive: true },
  });

  const onSubmit = (values: FormValues) => {
    createProduct.mutate(values, {
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
          New product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" placeholder="e.g. Wireless Mouse" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU (leave blank to auto-generate)</Label>
            <Input id="sku" placeholder="Auto-generated if empty" {...register("sku")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategoryCombobox categories={categories} value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Controller
                control={control}
                name="brandId"
                render={({ field }) => (
                  <BrandCombobox brands={brands} value={field.value} onChange={field.onChange} />
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
              <Label htmlFor="purchasePrice">Purchase price</Label>
              <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price</Label>
              <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} />
              {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low stock alert</Label>
              <Input id="lowStockThreshold" type="number" {...register("lowStockThreshold")} />
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
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Creating..." : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
