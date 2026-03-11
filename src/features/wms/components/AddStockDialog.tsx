"use client";

import { useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { useStockItems } from "@/src/features/stock/hooks/useStockItems";
import { StockItem } from "@/src/features/stock/interfaces/stock.interface";
import { WmsEntryItem } from "../interfaces/wms-entry.interface";

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: WmsEntryItem) => void;
}

const getLocationName = (stock: StockItem) => {
  const location = stock.ubicacion_info as StockItem["ubicacion_info"] & {
    nombre_completo?: string;
    nombre?: string;
  };
  return location?.nombre_completo ?? location?.nombre ?? "";
};

export const AddStockDialog = ({
  open,
  onOpenChange,
  onAddItem,
}: AddStockDialogProps) => {
  const { data: stockItems = [], isLoading, isError } = useStockItems();
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stockItems;
    return stockItems.filter((item) => {
      const producto = item.producto_info?.nombre ?? "";
      const almacen = item.almacen_info?.nombre ?? "";
      const ubicacion = getLocationName(item);
      const haystack = `${producto} ${almacen} ${ubicacion}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, stockItems]);

  const handleAdd = () => {
    if (!selectedItem) {
      setLocalError("Selecciona un stock item.");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setLocalError("Ingresa una cantidad válida.");
      return;
    }
    const item: WmsEntryItem = {
      stockId: selectedItem.id,
      productoNombre: selectedItem.producto_info?.nombre ?? "Producto sin nombre",
      almacenNombre: selectedItem.almacen_info?.nombre ?? "Sin almacén",
      ubicacionNombre: getLocationName(selectedItem) || "Sin ubicación",
      cantidad: Math.floor(cantidad),
    };
    onAddItem(item);
    setLocalError(null);
    setCantidad(1);
    setSelectedItem(null);
    onOpenChange(false);
  };

  const renderItemRow = (item: StockItem) => {
    const isActive = selectedItem?.id === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSelectedItem(item)}
        className={`w-full text-left px-4 py-3 border rounded-xl cursor-pointer transition-colors ${
          isActive
            ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
            : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {item.producto_info?.nombre ?? "Producto sin nombre"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {item.almacen_info?.nombre ?? "Sin almacén"} ·{" "}
              {getLocationName(item) || "Sin ubicación"}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            #{item.id}
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
      description="Selecciona un stock item e indica la cantidad a agregar."
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
          placeholder="Buscar por producto, almacén o ubicación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Cargando stock...
          </div>
        ) : isError ? (
          <div className="text-sm text-rose-500">Error al cargar stock.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No hay resultados.
              </div>
            ) : (
              filteredItems.map(renderItemRow)
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group/field w-full">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors">
              Stock seleccionado
            </label>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              {selectedItem
                ? `${selectedItem.producto_info?.nombre ?? "Producto sin nombre"}`
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
