"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ExistenciasIcon,
  ErrorIcon,
  ProductVariantsIcon,
} from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { plural } from "@/src/utils/plural";
import KpiGrid, { KpiGridSkeleton, type KpiItem } from "@/src/components/KpiGrid";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useStockPorAlmacenTable } from "../hooks/useStockPorAlmacenTable";
import { nextStockAlmacenQuery, STOCK_ALMACEN_PARAM } from "../utils/stockAlmacenQuery";
import { useStockPorAlmacenResumen } from "../hooks/useStockPorAlmacenResumen";
import type { StockPorAlmacenResumen } from "../interfaces/stock-por-almacen.interface";
import { getStockColumns } from "./StockColumns";
import { StockAlmacenContext } from "./StockResumenHeaderFilter";
import { SkuInfoDialog } from "./SkuInfoDialog";
import { WarehouseFilter } from "./WarehouseFilter";
import { StockEmptyState } from "./StockEmptyState";

// ─── KPIs del almacén completo (`resumen.kpis`) ──────────────────────────────

const pctOf = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

function StockStats({ kpis }: { kpis: StockPorAlmacenResumen["kpis"] }) {
  const { total_registros, skus_en_existencia, requiere_stock, total_stock } = kpis;
  const pctSkusEnExistencia = pctOf(skus_en_existencia, total_registros);
  const pctRequiereStock = pctOf(requiere_stock, total_registros);

  const items: KpiItem[] = [
    {
      label:       "SKUs en Existencia",
      value:       skus_en_existencia.toString(),
      icon:        ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass:   "text-sky-500",
      trendLabel:  `${pctSkusEnExistencia}% del total`,
      status:      "positive",
      progress:    pctSkusEnExistencia,
    },
    {
      label:       "Requiere Stock",
      value:       requiere_stock.toString(),
      icon:        ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass:   "text-red-500",
      trendLabel:  `${pctRequiereStock}% del total`,
      status:      "negative",
      progress:    pctRequiereStock,
    },
    {
      label:       "Total en Inventario",
      value:       total_stock.toLocaleString("es-MX"),
      icon:        ProductVariantsIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass:   "text-amber-500",
      trendLabel:  `${total_registros} ${plural(total_registros, "registro", "registros")}`,
      status:      "neutral",
      progress:    100,
    },
  ];

  return <KpiGrid items={items} />;
}

/**
 * Tarjetas de indicadores con su propia consulta (`resumen`): carga y error
 * independientes de la tabla. Un refetch fallido conserva las cifras y avisa
 * por toast desde el hook.
 */
function StockStatsSection({ almacenId }: { almacenId: number | null }) {
  const { data, isInitialError, isFetching, refetch } = useStockPorAlmacenResumen(almacenId);
  if (data) return <StockStats kpis={data.kpis} />;
  if (isInitialError) {
    return (
      <SectionErrorNotice
        title="No se pudieron cargar los indicadores"
        message="Ocurrió un problema al consultar el resumen del almacén. Intenta de nuevo en unos momentos."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }
  return <KpiGridSkeleton count={3} />;
}

// ─── Vista principal de existencias ──────────────────────────────────────────

/**
 * Existencias de un almacén en MODO SERVIDOR (`existencias/por-almacen/`):
 * el backend filtra, busca, ordena y pagina; los KPIs y las opciones de los
 * filtros salen de su resumen del almacén completo. La comparten WMS, Compras
 * y SCM y Producción (`StockPage`).
 *
 * La URL es la fuente de verdad: `?almacen=<id>` elige el almacén y el resto
 * (`nombre`, `estado`, `search`, `ordering`, `page`…) es de la tabla
 * (`stockPorAlmacenTable`).
 */
export function StockView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const almacenParam = searchParams.get(STOCK_ALMACEN_PARAM);
  const parsedAlmacen = almacenParam ? Number(almacenParam) : NaN;
  const almacenId =
    Number.isInteger(parsedAlmacen) && parsedAlmacen > 0 ? parsedAlmacen : null;
  const hasAlmacen = almacenId != null;

  // ── Catálogo de almacenes: valida que el almacén de la URL exista y siga
  // activo (no uno borrado/inactivo/inventado, p. ej. `?almacen=999`). ─────
  const { data: warehouses, refetch: refetchWarehouses } = useWarehouses();
  const warehousesLoaded = warehouses !== undefined;
  const activeWarehouses = (warehouses ?? [])
    .filter((w) => w.estatus === "ACTIVO")
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  // Solo se marca inválido una vez que ya sabemos qué almacenes existen; antes
  // de eso se asume válido para no bloquear la consulta con una espera extra.
  const isAlmacenInvalid =
    hasAlmacen &&
    warehousesLoaded &&
    !activeWarehouses.some((w) => w.id_almacen === almacenId);

  // Almacén con el que se consulta: ninguno mientras no haya uno válido.
  const queryAlmacenId = hasAlmacen && !isAlmacenInvalid ? almacenId : null;

  const table = useStockPorAlmacenTable(queryAlmacenId);
  const resumen = useStockPorAlmacenResumen(queryAlmacenId);

  /**
   * Cambiar de almacén reinicia la tabla (página, filtros, búsqueda y orden;
   * las opciones de los filtros son de cada almacén) en UNA sola escritura de
   * la URL, con `history.replaceState` como la propia tabla: así ningún render
   * ve el almacén nuevo con los filtros del anterior, y no se mezcla con un
   * `router.replace` asíncrono. Se conserva el tamaño de página. Después,
   * `table.clear()` cancela una búsqueda que siga en su pausa de escritura
   * (no escribe nada: la URL ya está limpia).
   */
  const handleAlmacenChange = (nextAlmacenId: number | null) => {
    const query = nextStockAlmacenQuery(new URLSearchParams(window.location.search), nextAlmacenId);
    if (query === null) return;
    const qs = query.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    table.clear();
  };

  // Si el almacén de la URL no existe o ya no está activo, se cae en
  // silencio al primero disponible (o se limpia el filtro si no hay ninguno)
  // en vez de dejar una consulta inválida en curso. `useEffectEvent` y no un
  // `eslint-disable` de `exhaustive-deps`: esa supresión hace que el React
  // Compiler se salte TODO el componente, y entonces las columnas se recrean
  // en cada render (cada tecla del buscador remontaba encabezados y celdas).
  const fallBackToFirstWarehouse = useEffectEvent(() => {
    const fallback = activeWarehouses[0] ?? null;
    handleAlmacenChange(fallback ? fallback.id_almacen : null);
  });
  useEffect(() => {
    if (isAlmacenInvalid) fallBackToFirstWarehouse();
  }, [isAlmacenInvalid]);

  // ── Diálogo de información del SKU (fuera de la tabla: los encabezados se
  // remontan al ordenar o paginar) ─────────────────────────────────────────
  const [skuInfoOpen, setSkuInfoOpen] = useState(false);
  const columns = getStockColumns(() => setSkuInfoOpen(true));

  // ── Estado vacío: sin almacén seleccionado no se consulta ni se muestran
  // KPIs/tabla. El selector va embebido para elegir uno desde aquí. ─────────
  if (!hasAlmacen) {
    return <StockEmptyState almacenId={almacenId} onSelect={handleAlmacenChange} />;
  }

  return (
    <StockAlmacenContext value={queryAlmacenId}>
      <div className="h-full flex flex-col min-h-0 space-y-6">
        {/* ── Barra de filtros (siempre visible, incluso en carga/error) ─────
            `shrink-0`: solo la tabla de abajo debe crecer. */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <WarehouseFilter value={almacenId} onChange={handleAlmacenChange} />
        </div>

        {/* `animate-stock-reveal` da la entrada sutil al elegir un almacén; el
            wrapper NO va keyeado por almacén, así que al cambiar entre dos
            almacenes válidos permanece montado y no se repite. */}
        <div className="flex-1 min-h-0 flex flex-col space-y-6 animate-stock-reveal">
          {/* KPIs del almacén completo: consulta propia, con su carga y su
              error, independientes de la tabla. `shrink-0`: solo la tabla
              debe crecer. */}
          <div className="shrink-0">
            <StockStatsSection almacenId={queryAlmacenId} />
          </div>

          {/* ── Tabla de existencias (modo servidor) ────────────────────────
              Se monta SIEMPRE: carga, error y vacío se pintan en su cuerpo y
              el encabezado con sus filtros sigue montado. `fillHeight`: el
              cuerpo llena el espacio restante del contenedor de altura
              acotada que da `StockPage`. `min-h-120`: piso de la tabla cuando
              el filtro de almacén + los KPIs dejan poco espacio. */}
          <div className="flex-1 min-h-120 flex flex-col">
            <DataTable
              columns={columns}
              {...table.tableProps}
              searchPlaceholder="Buscar por producto o SKU..."
              fillHeight
              // "Actualizar datos" relee también los KPIs y el catálogo de
              // almacenes. Sin almacén válido la consulta está deshabilitada y
              // `refetch()` consultaría igual: no se ofrece.
              onRefetch={
                queryAlmacenId === null
                  ? undefined
                  : async () => {
                      await Promise.all([table.refetch(), resumen.refetch(), refetchWarehouses()]);
                    }
              }
              loadingAriaLabel="Cargando existencias"
              errorTitle="Error al cargar existencias"
            />
          </div>
        </div>

        <SkuInfoDialog open={skuInfoOpen} onOpenChange={setSkuInfoOpen} />
      </div>
    </StockAlmacenContext>
  );
}
