"use client";

import { useState } from "react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DeleteIcon, ScanLineIcon, XIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useIsCompanyAdmin } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { rfidScanColumns } from "./RfidScanColumns";
import { RfidScannerStats } from "./RfidScannerStats";
import { useClearRfidScans } from "../hooks/useClearRfidScans";
import { useRfidScans } from "../hooks/useRfidScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";
import { useRfidScannerStats } from "../hooks/useRfidScannerStats";

/**
 * Monitor de lecturas del lector RFID (FX9600): barra de estado del lector más
 * el listado en vivo de las últimas 50 lecturas, cada una marcada con si el EPC
 * corresponde o no a una etiqueta impresa por el ERP.
 *
 * No hay alta ni edición: una lectura es un evento del lector, no un documento.
 * La única escritura es la purga del buffer ("Limpiar lecturas"), que el
 * backend restringe a superusuario o administrador de empresa y acota a la
 * empresa activa (EC-884). La barra de estado del lector sale de
 * `scanner-stats`, restringido igual, así que también es solo para ellos.
 *
 * Todo lo que lee se acota a la empresa activa, así que la ruta pasa por
 * `CompanyGate` (`companyGatedRoutes`): sin empresa no se monta esta vista ni
 * se pide nada, y se muestra el aviso de "sin empresa" en su lugar (#506).
 *
 * El interruptor de monitoreo controla el `enabled` del polling (3 s, ver
 * `useRfidScans`). Vive en el `actionButton` de `DataTable`, que es la única
 * zona del armazón que permanece montada durante la carga y el error: si el
 * endpoint falla, el operador todavía puede detener el ciclo en vez de quedarse
 * con una petición fallando cada 3 segundos.
 */
export function RfidScannerView() {
  // Arranca DETENIDO: el operador decide cuándo escanear con "Iniciar
  // escaneo". Al entrar solo se consulta una vez el estado del lector.
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  // Por defecto solo las etiquetas impresas por el ERP: las ajenas (`3035…`)
  // que hay alrededor del lector son ruido para el operador.
  const [soloMatch, setSoloMatch] = useState(true);
  // Filtros visibles arriba de la tabla (en memoria): campo de la fila → valor.
  const [filters, setFilters] = useState<Partial<Record<ScanFilterKey, string>>>({});
  // Solo los refrescos que pide la PERSONA. No sirve `isFetching` de la
  // consulta: con el monitoreo encendido se pone en `true` en cada sondeo, y
  // `DataTable` traduce eso a `disabled` + `animate-spin` en su botón de
  // actualizar — que quedaría parpadeando y rechazando clics cada 3 segundos.
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // La purga (`scans/clear/`) y `scanner-stats` los permite el backend solo a
  // superusuario o administrador de empresa; no mira ningún código del
  // catálogo de permisos. Es la misma regla que
  // `useIsCompanyAdmin`, que falla cerrado: mientras la sesión no lo confirme,
  // ni botón ni petición. Esto es solo UX: la frontera real es el backend, que
  // responde 403 con su propio mensaje si rechaza la llamada.
  const isCompanyAdmin = useIsCompanyAdmin();

  const { scans, isLoading, isError, isSuccess, error, hasLoaded, refetch } =
    useRfidScans(isMonitoring, { soloMatch });
  const {
    stats,
    isLoading: isStatsLoading,
    isSuccess: isStatsSuccess,
    refetch: refetchStats,
  } = useRfidScannerStats(isCompanyAdmin);
  const { mutate: clearScans, isPending: isClearing } = useClearRfidScans();

  // "Nada que limpiar" exige que AMBAS fuentes lo confirmen con una respuesta
  // vigente: la tabla —solo con el monitoreo encendido, porque detenida es una
  // foto congelada— y el total de `scanner-stats`, que cuenta las mismas
  // lecturas que borra la purga (las de la empresa activa). En cualquier otro
  // caso (cargando, error, monitoreo detenido) el botón queda habilitado: ante
  // la duda se deja intentar, y el backend responde igual.
  // `isSuccess` y no `hasLoaded`: tras un refetch fallido la caché conserva
  // datos viejos, pero ya no confirman nada.
  // Con el filtro "Solo etiquetas del ERP" una tabla vacía no dice nada del
  // total: pueden quedar lecturas ajenas.
  const hasNothingToClear =
    isMonitoring &&
    !soloMatch &&
    isSuccess &&
    scans.length === 0 &&
    isStatsSuccess &&
    stats?.total_rfidscan_rows === 0;

  const showError = isInitialLoadError(isError, hasLoaded);

  // Filtros por chip, en memoria (la lista ya viene completa: a lo más
  // `limite` lecturas únicas). Las opciones salen de las lecturas en pantalla.
  const filterConfig = buildScanFilters(scans);
  const activeFilters = Object.entries(filters).filter(([, value]) => value) as [
    ScanFilterKey,
    string,
  ][];
  const visibleScans = activeFilters.length
    ? scans.filter((scan) =>
        activeFilters.every(([key, value]) => String(scan[key] ?? "") === value),
      )
    : scans;
  const productosDistintos = new Set(
    visibleScans.filter((scan) => scan.match_impresion).map((scan) => scan.producto_nombre ?? ""),
  ).size;
  const conMatch = scans.filter((scan) => scan.match_impresion).length;

  const handleToggleMonitoring = () => {
    const next = !isMonitoring;
    setIsMonitoring(next);
    // Al encender se revalida el estado del lector de inmediato, sin esperar
    // al primer ciclo de 30 s de `scanner-stats`. Es también lo que reanuda ese
    // polling si se había apagado por un error (ver `useRfidScannerStats`).
    // Solo para administradores: `refetch()` ignora el `enabled: false` de la
    // consulta, y a cualquier otro usuario el backend le respondería 403.
    if (next && isCompanyAdmin) void refetchStats();
  };

  // El botón de refrescar de la tabla actualiza AMBAS consultas. `refetch()`
  // fuerza la petición aunque la consulta esté deshabilitada, así que también
  // sirve como "traer una vez" con el monitoreo detenido. Por lo mismo,
  // `scanner-stats` solo se pide para administradores (ver arriba).
  const handleRefetch = async () => {
    setIsManualRefetching(true);
    try {
      await Promise.all([refetch(), isCompanyAdmin ? refetchStats() : undefined]);
    } finally {
      setIsManualRefetching(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      {/* `shrink-0`: solo la tabla de abajo debe crecer para llenar el
          espacio disponible. Solo para administradores: a cualquier otro
          usuario `scanner-stats` no se le pide, y la barra quedaría para
          siempre en "Estado del lector desconocido". */}
      {isCompanyAdmin && (
        <div className="shrink-0">
          <RfidScannerStats stats={stats} isLoading={isStatsLoading} />
        </div>
      )}

      {scans.length > 0 && (
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          {filterConfig.map((config) => (
            <label key={config.id} className="relative inline-flex items-center">
              <span className="sr-only">{config.label}</span>
              <select
                value={filters[config.id as ScanFilterKey] ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, [config.id]: event.target.value }))
                }
                className={`h-8 max-w-56 cursor-pointer truncate rounded-lg border px-2.5 pr-7 text-xs outline-none transition-colors focus:ring-2 focus:ring-sky-500/40 ${
                  filters[config.id as ScanFilterKey]
                    ? "border-sky-300 bg-sky-50 font-semibold text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                    : "border-slate-200 bg-transparent text-slate-600 dark:border-white/10 dark:text-slate-300"
                }`}
              >
                <option value="">{config.label}: todos</option>
                {config.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="h-8 rounded-lg px-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Limpiar filtros
            </button>
          )}
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <SummaryPopover
              value={visibleScans.length}
              label={visibleScans.length === 1 ? "etiqueta" : "etiquetas"}
              title="Etiquetas por código"
              items={countBy(visibleScans, (scan) => scan.barcode_value || scan.epc)}
            />
            <SummaryPopover
              value={productosDistintos}
              label={productosDistintos === 1 ? "producto" : "productos"}
              title="Productos detectados (clic para filtrar)"
              items={countBy(
                visibleScans.filter((scan) => scan.match_impresion),
                (scan) => scan.producto_nombre || "Sin nombre",
              )}
              onPick={(producto) =>
                setFilters((prev) => ({ ...prev, producto_nombre: producto }))
              }
            />
            {!soloMatch && (
              <span className="text-rose-600 dark:text-rose-400">
                <strong className="font-semibold tabular-nums">{scans.length - conMatch}</strong> sin match
              </span>
            )}
          </div>
        </div>
      )}

      {/* Altura fija: la página hace scroll si hace falta y las filas hacen
          scroll dentro de la tabla, con el encabezado siempre visible. */}
      <div className="h-[72vh] min-h-130 shrink-0 flex flex-col">
      <DataTable
        columns={rfidScanColumns}
        data={visibleScans}
        searchPlaceholder="Buscar EPC, SKU, color, talla o folio..."
        getRowId={(row) => String(row.id)}
        // El cuerpo llena el contenedor de altura acotada que da
        // `wms/rfid-scanner/page.tsx`, en vez de reservar un alto fijo.
        fillHeight
        onRefetch={handleRefetch}
        isRefetching={isManualRefetching}
        actionButton={
          <div className="flex items-center gap-2">
            {isCompanyAdmin && (
              <>
                {/* El `title` va en un `<span>` y no en el botón: un `<button>`
                    deshabilitado no recibe eventos de puntero, así que el
                    navegador no siempre muestra su tooltip. Por eso, además,
                    el botón vacío lleva `pointer-events-none!`: así el puntero
                    "atraviesa" el botón y el hover cae en el `span`. */}
                <span
                  className="inline-flex"
                  title={hasNothingToClear ? "No hay lecturas para limpiar" : undefined}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setIsClearOpen(true)}
                    disabled={isClearing || hasNothingToClear}
                    className={`h-9 py-0! text-xs! hover:text-rose-600! hover:border-rose-200! dark:hover:text-rose-400! dark:hover:border-rose-900! ${hasNothingToClear ? "pointer-events-none!" : ""}`}
                    leftIcon={<DeleteIcon className="w-3.5 h-3.5" />}
                  >
                    {isClearing ? "Limpiando..." : "Limpiar"}
                  </Button>
                </span>
                {/* Diálogo controlado por estado y NO por el `trigger` de
                    `ConfirmDialog`: el botón de arriba necesita su propio
                    `variant`/`leftIcon`/`disabled`, que el trigger no expone.
                    Mismo patrón que `ColorColumns`.

                    Queda abierto y bloqueado (`busy`) mientras corre la purga,
                    como en `VacationList`: se cierra solo si el backend
                    confirma; si falla sigue abierto y el toast de
                    `useClearRfidScans` explica por qué. `busy` ya bloquea
                    todas las vías de cierre (Esc, clic fuera y Cancelar), así
                    que `onOpenChange` no necesita su propia guarda. */}
                <ConfirmDialog
                  open={isClearOpen}
                  onOpenChange={setIsClearOpen}
                  title="Limpiar lecturas RFID"
                  description="Se eliminarán las lecturas RFID de la empresa activa, de todas sus sucursales. Las de otras empresas y las que no están ligadas a ninguna empresa se conservan. Esta acción no se puede deshacer."
                  confirmationWord="LIMPIAR"
                  confirmText={isClearing ? "Eliminando..." : "Eliminar"}
                  confirmColor="red"
                  closeOnConfirm={false}
                  busy={isClearing}
                  onConfirm={() =>
                    clearScans(undefined, {
                      onSuccess: () => setIsClearOpen(false),
                    })
                  }
                />
              </>
            )}
            <button
              type="button"
              aria-pressed={soloMatch}
              onClick={() => setSoloMatch((value) => !value)}
              title="Ocultar etiquetas que no imprimió el ERP"
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${
                soloMatch
                  ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${soloMatch ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"}`}
              />
              Solo del ERP
            </button>
            <Button
              variant={isMonitoring ? "secondary" : "primary"}
              onClick={handleToggleMonitoring}
              className="h-9 py-0! text-xs! shadow-none!"
              leftIcon={
                isMonitoring ? (
                  <XIcon className="w-3.5 h-3.5" />
                ) : (
                  <ScanLineIcon className="w-3.5 h-3.5" />
                )
              }
            >
              {isMonitoring ? "Detener escaneo" : "Iniciar escaneo"}
            </Button>
          </div>
        }
        emptyMessage={
          isMonitoring
            ? soloMatch
              ? "Sin etiquetas del ERP todavía. Pasa una etiqueta impresa frente a la antena."
              : "Sin lecturas todavía. Pasa una etiqueta frente a la antena."
            : "Escaneo detenido. Presiona “Iniciar escaneo” para ver las lecturas en vivo."
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las lecturas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando lecturas"
      />
      </div>
    </div>
  );
}

/** Opciones únicas y ordenadas de un campo de las lecturas, para un chip. */
function optionsOf(scans: RfidScan[], pick: (scan: RfidScan) => string | number | null | undefined) {
  const values = new Set<string>();
  for (const scan of scans) {
    const value = pick(scan);
    if (value !== null && value !== undefined && value !== "") values.add(String(value));
  }
  return [...values]
    .sort((a, b) => a.localeCompare(b, "es-MX", { numeric: true }))
    .map((value) => ({ value, label: value }));
}

/** Chips de filtro: solo los campos que traen más de un valor (filtrar por un
 *  valor único no reduce nada). El `id` es la llave cruda de la fila, que es
 *  lo que compara `DataTable`. */
type ScanFilterKey =
  | "producto_nombre"
  | "barcode_value"
  | "color"
  | "talla"
  | "impresion_folio"
  | "antenna";

function buildScanFilters(scans: RfidScan[]): DataTableFilterConfig[] {
  const candidates: DataTableFilterConfig[] = [
    { id: "producto_nombre", label: "Producto", options: optionsOf(scans, (s) => s.producto_nombre) },
    { id: "barcode_value", label: "Código", options: optionsOf(scans, (s) => s.barcode_value) },
    { id: "color", label: "Color", options: optionsOf(scans, (s) => s.color) },
    { id: "talla", label: "Talla", options: optionsOf(scans, (s) => s.talla) },
    { id: "impresion_folio", label: "Folio", options: optionsOf(scans, (s) => s.impresion_folio) },
    { id: "antenna", label: "Antena", options: optionsOf(scans, (s) => s.antenna) },
  ];
  return candidates.filter((config) => config.options.length > 1);
}

/** Conteo por clave, de mayor a menor. */
function countBy(scans: RfidScan[], key: (scan: RfidScan) => string) {
  const counts = new Map<string, number>();
  for (const scan of scans) counts.set(key(scan), (counts.get(key(scan)) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es-MX"))
    .map(([name, count]) => ({ name, count }));
}

/** Contador del resumen que abre (hover o clic) el desglose de lo que cuenta.
 *  Con `onPick`, cada renglón filtra la tabla por ese valor. */
function SummaryPopover({
  value,
  label,
  title,
  items,
  onPick,
}: {
  value: number;
  label: string;
  title: string;
  items: { name: string; count: number }[];
  onPick?: (name: string) => void;
}) {
  // Hover lo muestra; el clic lo deja fijo (y otro clic lo cierra).
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const setOpen = (value: boolean) => {
    setPinned(value);
    if (!value) setHovered(false);
  };
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setPinned((prev) => !prev)}
        className="rounded-md px-1.5 py-0.5 underline decoration-dotted decoration-slate-400 underline-offset-4 hover:bg-slate-100 dark:decoration-slate-600 dark:hover:bg-white/[0.06]"
      >
        <strong className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</strong>{" "}
        {label}
      </button>
      {open && items.length > 0 && (
        <div className="absolute right-0 top-full z-30 pt-2">
          <div className="w-96 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0d1117]/95 dark:shadow-black/50">
            <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {onPick ? "Clic para filtrar" : `${items.length} distintos`}
              </p>
            </div>
            <ul className="max-h-80 space-y-0.5 overflow-auto p-1.5">
              {items.map((item) => {
                const max = items[0]?.count || 1;
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      disabled={!onPick}
                      onClick={() => {
                        onPick?.(item.name);
                        setOpen(false);
                      }}
                      className="group w-full rounded-xl px-2.5 py-2 text-left transition-colors enabled:hover:bg-slate-50 disabled:cursor-default dark:enabled:hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className="text-xs leading-snug text-slate-700 group-enabled:group-hover:text-slate-900 dark:text-slate-300 dark:group-enabled:group-hover:text-white"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {item.count}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-sky-500/70 dark:bg-sky-400/60"
                          style={{ width: `${(item.count / max) * 100}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
