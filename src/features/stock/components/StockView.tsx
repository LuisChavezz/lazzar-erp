"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExistenciasIcon,
  ErrorIcon,
  ProductVariantsIcon,
} from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
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

  const pctSkusEnExistencia = items.length > 0
    ? Math.round((skusEnExistencia / items.length) * 100)
    : 0;
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
      trendLabel:  `${pctSkusEnExistencia}% del total`,
      status:      "positive",
      progress:    pctSkusEnExistencia,
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

  // ── Catálogo de almacenes: valida que el almacén de la URL exista y siga
  // activo (no uno borrado/inactivo/inventado, p. ej. `?almacen=999`). ─────
  const { data: warehouses, refetch: refetchWarehouses } = useWarehouses();
  const warehousesLoaded = warehouses !== undefined;
  const activeWarehouses = useMemo(
    () =>
      (warehouses ?? [])
        .filter((w) => w.estatus === "ACTIVO")
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [warehouses],
  );
  // Solo se marca inválido una vez que ya sabemos qué almacenes existen; antes
  // de eso se asume válido para no bloquear la consulta con una espera extra.
  const isAlmacenInvalid =
    hasAlmacen &&
    warehousesLoaded &&
    !activeWarehouses.some((w) => w.id_almacen === almacenId);

  const filters = almacenId ? { almacen_id: almacenId } : undefined;

  // El fetch se activa solo cuando hay un almacén seleccionado y no se sabe
  // todavía que sea inválido: evita consultar existencias con un almacen_id
  // que no corresponde a ningún almacén real o activo.
  const {
    data: stockItems = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useStockItems(filters, { enabled: hasAlmacen && !isAlmacenInvalid });

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

  // Si el almacén de la URL no existe o ya no está activo, se cae en
  // silencio al primero disponible (o se limpia el filtro si no hay ninguno)
  // en vez de dejar una consulta inválida en curso con una etiqueta genérica
  // de "sin selección".
  useEffect(() => {
    if (!isAlmacenInvalid) return;
    const fallback = activeWarehouses[0] ?? null;
    handleAlmacenChange(fallback ? fallback.id_almacen : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlmacenInvalid]);

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

      {/* El estado de error (con botón "Reintentar") es una capacidad distinta
          del `ErrorState` interno de `DataTable` (que no ofrece retry); se
          conserva tal cual en vez de migrarse a las props `isError`/
          `errorTitle` de `DataTable`. Solo el estado de carga se migra a la
          prop `isLoading`, para que la tabla (con sus KPIs) permanezca
          montada mientras carga en lugar de un `Loader` a pantalla completa. */}
      {isError ? (
        <div className="space-y-3">
          <ErrorState
            title="Error al cargar existencias"
            message={extractErrorMessage(error, "No se pudo cargar la información.")}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        // `animate-stock-reveal` da la entrada sutil al elegir un almacén.
        // El wrapper NO va keyeado por almacén, así que al cambiar entre dos
        // almacenes válidos permanece montado y la animación no se repite.
        <div className="space-y-6 animate-stock-reveal">
          {/* ── KPIs calculados sobre los datos ya filtrados por almacén ────
              Ocultos durante la carga INICIAL (`isLoading`, sin datos ni
              placeholder): antes se mostraban con existencias en cero (p. ej.
              "Total en Inventario: 0") hasta que llegaba la respuesta. En un
              cambio de almacén (`isSwitchingAlmacen` = `isFetching &&
              isPlaceholderData`, con los datos del almacén anterior como
              placeholder) `isLoading` es false, así que siguen visibles pero
              atenuados, igual que la tabla, en vez de mostrar en silencio las
              cifras del almacén anterior sin ningún indicador visual. */}
          {!isLoading && (
            <div
              className={
                isSwitchingAlmacen
                  ? "blur-sm pointer-events-none select-none transition-[filter] duration-200"
                  : "transition-[filter] duration-200"
              }
            >
              <StockStats items={stockItems} maxStock={maxStock} />
            </div>
          )}

          {/* ── Tabla de existencias ───────────────────────────────────────
              El componente permanece montado al cambiar de almacén: el
              `queryKey` de `useStockItems` ya incluye el almacén y trae los
              datos correctos sin remontar la tabla (lo que antes borraba
              sort/búsqueda/filtros/columnas). Solo la paginación se reinicia
              a la página 1, vía `paginationResetKey`. */}
          <DataTable
            columns={columns}
            data={enrichedData}
            searchPlaceholder="Buscar por producto o SKU..."
            filterConfig={stockFilterConfig}
            onRefetch={async () => {
              await Promise.all([refetch(), refetchWarehouses()]);
            }}
            isRefetching={isFetching}
            isLoadingOverlay={isSwitchingAlmacen}
            loadingTitle="Actualizando existencias"
            loadingMessage="Estamos cargando las existencias del almacén seleccionado."
            paginationResetKey={almacenId}
            isLoading={isLoading}
            loadingAriaLabel="Cargando existencias"
          />
        </div>
      )}

      <SkuInfoDialog open={skuInfoOpen} onOpenChange={setSkuInfoOpen} />
    </div>
  );
}
