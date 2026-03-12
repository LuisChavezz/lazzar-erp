"use client";

import { useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { Product } from "@/src/features/products/interfaces/product.interface";

type AddProductItem = {
  productoId: number;
  productoNombre: string;
  cantidad: number;
};

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: AddProductItem) => void;
}

export const AddProductDialog = ({
  open,
  onOpenChange,
  onAddItem,
}: AddProductDialogProps) => {
  const { products = [], isLoading, isError } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const activeProducts = useMemo(() => products.filter((product) => product.activo), [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeProducts;
    return activeProducts.filter((product) => {
      const haystack = `${product.nombre} ${product.descripcion} ${product.tipo}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, activeProducts]);

  const handleAdd = () => {
    if (!selectedProduct) {
      setLocalError("Selecciona un producto.");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setLocalError("Ingresa una cantidad válida.");
      return;
    }
    const item: AddProductItem = {
      productoId: selectedProduct.id,
      productoNombre: selectedProduct.nombre,
      cantidad: Math.floor(cantidad),
    };
    onAddItem(item);
    setLocalError(null);
    setCantidad(1);
    setSelectedProduct(null);
    onOpenChange(false);
  };

  const renderProductRow = (product: Product) => {
    const isActive = selectedProduct?.id === product.id;
    return (
      <button
        key={product.id}
        type="button"
        onClick={() => setSelectedProduct(product)}
        className={`w-full text-left px-4 py-3 border rounded-xl cursor-pointer transition-colors ${
          isActive
            ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
            : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {product.nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {product.tipo}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            #{product.id}
          </span>
        </div>
      </button>
    );
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      title="Agregar producto"
      description="Selecciona un producto e indica la cantidad a agregar."
      actionButtonClose={false}
      actionButton={
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold tracking-wide hover:bg-sky-700 transition-colors"
        >
          Agregar
        </button>
      }
    >
      <div className="space-y-4">
        <FormInput
          label="Buscar"
          placeholder="Buscar por nombre, descripción o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Cargando productos...
          </div>
        ) : isError ? (
          <div className="text-sm text-rose-500">Error al cargar productos.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No hay resultados.
              </div>
            ) : (
              filteredProducts.map(renderProductRow)
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group/field w-full">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors">
              Producto seleccionado
            </label>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              {selectedProduct
                ? `${selectedProduct.nombre}`
                : "Ninguno"}
            </div>
          </div>

          <div className="group/field w-full">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors">
              Cantidad
            </label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="w-full outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:focus:bg-black/40"
            />
          </div>
        </div>

        {localError && <div className="text-sm text-rose-500">{localError}</div>}
      </div>
    </MainDialog>
  );
};
