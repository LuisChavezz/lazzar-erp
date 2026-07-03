"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExistenciasIcon,
  ErrorIcon,
  ProductVariantsIcon,
} from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { useStockItems } from "../hooks/useStockItems";
import {
  getStockColumns,
  getStockStatus,
} from "./StockColumns";
import { SkuInfoDialog } from "./SkuInfoDialog";
import { WarehouseFilter } from "./WarehouseFilter";
import { StockEmptyState } from "./StockEmptyState";
import type { StockItem } from "../interfaces/stock.interface";
import { enrichStockWithStatus, stockFilterConfig } from "./StockFilter";



// ─── Componente: KPIs calculados sobre datos reales ──────────────────────────

function StockStats({ items, maxStock }: { items: StockItem[]; maxStock: number }) {
  const skusEnExistencia = items.filter((i) => i.stock > 0).length;
  const requiereStock    = items.filter(
    (i) => {
      const status = getStockStatus(i.stock, maxStock);
      return status === "low" || status === "critical";
    }
  ).length;
  const totalStock       = items.reduce((acc, i) => acc + i.stock, 0);

  const pctRequiereStock = items.length > 0
    ? Math.round((requiereStock / items.length) * 100)
    : 0;

  const kpis: KpiItem[] = [
    {
      label:       "SKUs en Existencia",
      value:       skusEnExistencia.toString(),
      icon:        ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass:   "text-sky-500",
      trendLabel:  `${Math.round((skusEnExistencia / items.length) * 100)}% del total`,
      status:      "positive",
      progress:    items.length > 0 ? Math.round((skusEnExistencia / items.length) * 100) : 0,
    },
    {
      label:       "Requiere Stock",
      value:       requiereStock.toString(),
      icon:        ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass:   "text-red-500",
      trendLabel:  `${pctRequiereStock}% del total`,
      status:      "negative",
      progress:    pctRequiereStock,
    },
    {
      label:       "Total en Inventario",
      value:       totalStock.toLocaleString("es-MX"),
      icon:        ProductVariantsIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass:   "text-amber-500",
      trendLabel:  `${items.length} registros`,
      status:      "neutral",
      progress:    100,
    },
  ];

  return <KpiGrid items={kpis} />;
}



// ─── Vista principal de existencias ──────────────────────────────────────────

/**
 * Vista de existencias con datos obtenidos de la API.
 * Incluye KPIs, filtros por almacén / categoría / estado y tabla de datos.
 * El buscador interno y la paginación los gestiona `DataTable`.
 */
export function StockView() {
  // ── Filtro de almacén: la URL (`?almacen=<id>`) es la fuente de verdad ───
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const almacenParam = searchParams.get("almacen");
  const parsedAlmacen = almacenParam ? Number(almacenParam) : NaN;
  const almacenId =
    Number.isInteger(parsedAlmacen) && parsedAlmacen > 0 ? parsedAlmacen : null;
  const hasAlmacen = almacenId != null;

  const filters = almacenId ? { almacen_id: almacenId } : undefined;

  // El fetch se activa solo cuando hay un almacén seleccionado: sin él no se
  // consulta el backend y se muestra el estado vacío.
  const {
    data: stockItems = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useStockItems(filters, { enabled: hasAlmacen });

  // Cambio de almacén en curso: `keepPreviousData` sigue mostrando los datos
  // del almacén anterior mientras llega la nueva página. Distinto de
  // `isLoading` (que solo es true en la primera carga, sin datos previos que
  // mostrar como placeholder).
  const isSwitchingAlmacen = isFetching && isPlaceholderData;

  // Cambiar de almacén es ajustar un filtro, no navegar: usamos `replace` para
  // no ensuciar el historial (el botón "atrás" regresa a la pantalla previa en
  // lugar de recorrer cada selección). La URL sigue siendo compartible y
  // sobrevive al refresh / back-forward.
  const handleAlmacenChange = (nextAlmacenId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextAlmacenId == null) {
      params.delete("almacen");
    } else {
      params.set("almacen", String(nextAlmacenId));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── Diálogo de información del SKU (renderizado fuera de la tabla; ver
  // `SkuColumnHeader` en StockColumns.tsx para el motivo) ──────────────────
  const [skuInfoOpen, setSkuInfoOpen] = useState(false);

  // ── Máximo stock para normalizar el anillo ───────────────────────────────
  const maxStock = useMemo(
    () => stockItems.reduce((max, item) => Math.max(max, item.stock), 0),
    [stockItems],
  );

  // ── Columnas con el maxStock calculado ───────────────────────────────────
  const columns = useMemo(
    () => getStockColumns(maxStock || undefined, () => setSkuInfoOpen(true)),
    [maxStock],
  );

  // ── Datos enriquecidos con estado computado para filtros ─────────────────
  const enrichedData = useMemo(
    () => enrichStockWithStatus(stockItems, maxStock),
    [stockItems, maxStock],
  );

  // ── Estado vacío: sin almacén seleccionado no se consulta ni se muestran
  // KPIs/tabla. El selector va embebido para elegir uno desde aquí. ─────────
  if (!hasAlmacen) {
    return <StockEmptyState almacenId={almacenId} onSelect={handleAlmacenChange} />;
  }

  return (
    <div className="space-y-6">
      {/* ── Barra de filtros (siempre visible, incluso en carga/error) ───── */}
      <div className="flex flex-wrap items-center gap-3">
        <WarehouseFilter value={almacenId} onChange={handleAlmacenChange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          <span className="ml-3 text-sm text-slate-500">
            Cargando existencias...
          </span>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error al cargar existencias
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            {(error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        // `animate-stock-reveal` da la entrada sutil al elegir un almacén.
        // El wrapper NO va keyeado por almacén, así que al cambiar entre dos
        // almacenes válidos permanece montado y la animación no se repite.
        <div className="space-y-6 animate-stock-reveal">
          {/* ── KPIs calculados sobre los datos ya filtrados por almacén ──── */}
          <StockStats items={stockItems} maxStock={maxStock} />

          {/* ── Tabla de existencias ───────────────────────────────────────
              `key={almacenId}` remonta la tabla al cambiar de almacén, lo que
              resetea la paginación a la página 1 (DataTable gestiona la página
              internamente y no expone forma de resetearla desde fuera). */}
          <DataTable
            key={almacenId}
            columns={columns}
            data={enrichedData}
            searchPlaceholder="Buscar por producto, SKU o almacén..."
            filterConfig={stockFilterConfig}
            onRefetch={async () => {
              await refetch();
            }}
            isRefetching={isFetching}
            isLoadingOverlay={isSwitchingAlmacen}
            loadingTitle="Actualizando existencias"
            loadingMessage="Estamos cargando las existencias del almacén seleccionado."
          />
        </div>
      )}

      <SkuInfoDialog open={skuInfoOpen} onOpenChange={setSkuInfoOpen} />
    </div>
  );
}
