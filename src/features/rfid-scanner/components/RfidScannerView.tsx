"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DeleteIcon, ScanLineIcon, XIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { rfidScanColumns } from "./RfidScanColumns";
import { RfidScannerStats } from "./RfidScannerStats";
import { useClearRfidScans } from "../hooks/useClearRfidScans";
import { useRfidScans } from "../hooks/useRfidScans";
import { useRfidScannerStats } from "../hooks/useRfidScannerStats";

/**
 * Monitor de lecturas del lector RFID (FX9600): barra de estado del lector más
 * el listado en vivo de las últimas 50 lecturas, cada una marcada con si el EPC
 * corresponde o no a una etiqueta impresa por el ERP.
 *
 * No hay alta ni edición: una lectura es un evento del lector, no un documento.
 * La única escritura es la purga del buffer ("Limpiar lecturas"), que el
 * backend restringe a superusuario o administrador de empresa.
 *
 * El interruptor de monitoreo controla el `enabled` del polling (3 s, ver
 * `useRfidScans`). Vive en el `actionButton` de `DataTable`, que es la única
 * zona del armazón que permanece montada durante la carga y el error: si el
 * endpoint falla, el operador todavía puede detener el ciclo en vez de quedarse
 * con una petición fallando cada 3 segundos.
 */
export function RfidScannerView() {
  // Arranca encendido: se entra a esta pantalla para ver lecturas, y exigir un
  // clic extra para que aparezca la primera dejaría la tabla vacía sin motivo
  // aparente.
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isClearOpen, setIsClearOpen] = useState(false);
  // Solo los refrescos que pide la PERSONA. No sirve `isFetching` de la
  // consulta: con el monitoreo encendido se pone en `true` en cada sondeo, y
  // `DataTable` traduce eso a `disabled` + `animate-spin` en su botón de
  // actualizar — que quedaría parpadeando y rechazando clics cada 3 segundos.
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const { scans, isLoading, isError, isSuccess, error, hasLoaded, refetch } =
    useRfidScans(isMonitoring);
  const {
    stats,
    isLoading: isStatsLoading,
    isSuccess: isStatsSuccess,
    refetch: refetchStats,
  } = useRfidScannerStats(isMonitoring);
  const { mutate: clearScans, isPending: isClearing } = useClearRfidScans();

  // La purga se rige por `D-WMS-SCANNER` del catálogo de permisos, igual que
  // el resto de acciones de la app. `hasPermission` ya cortocircuita para el
  // rol "admin". Esto es solo UX: la frontera real es el backend, que responde
  // 403 con su propio mensaje si rechaza la llamada.
  const { data: session } = useSession();
  const canClearScans = hasPermission("D-WMS-SCANNER", session?.user);

  // "Nada que limpiar" exige que AMBAS fuentes lo confirmen con una respuesta
  // vigente: la tabla —solo con el monitoreo encendido, porque detenida es una
  // foto congelada— y el total global de `scanner-stats`. En cualquier otro
  // caso (cargando, error, monitoreo detenido, stats con 403) el botón queda
  // habilitado: ante la duda se deja intentar, y el backend responde igual.
  // `isSuccess` y no `hasLoaded`: tras un refetch fallido la caché conserva
  // datos viejos, pero ya no confirman nada.
  const hasNothingToClear =
    isMonitoring &&
    isSuccess &&
    scans.length === 0 &&
    isStatsSuccess &&
    stats?.total_rfidscan_rows === 0;

  const showError = isInitialLoadError(isError, hasLoaded);

  const handleToggleMonitoring = () => {
    const next = !isMonitoring;
    setIsMonitoring(next);
    // Al encender se revalida el estado del lector de inmediato, sin esperar
    // al primer ciclo de 15 s de `scanner-stats`. Es también lo que reanuda ese
    // polling si se había apagado por un error (ver `useRfidScannerStats`).
    if (next) void refetchStats();
  };

  // El botón de refrescar de la tabla actualiza AMBAS consultas. `refetch()`
  // fuerza la petición aunque la consulta esté deshabilitada, así que también
  // sirve como "traer una vez" con el monitoreo detenido.
  const handleRefetch = async () => {
    setIsManualRefetching(true);
    try {
      await Promise.all([refetch(), refetchStats()]);
    } finally {
      setIsManualRefetching(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-6">
      {/* `shrink-0`: solo la tabla de abajo debe crecer para llenar el
          espacio disponible. */}
      <div className="shrink-0">
        <RfidScannerStats stats={stats} isLoading={isStatsLoading} />
      </div>

      {/* `min-h-120`: piso de la tabla cuando la barra de estado del lector
          deja poco espacio remanente — sin esto, `flex-1` podía encoger la
          tabla a un puñado de filas visibles en viewports más cortos. */}
      <div className="flex-1 min-h-120 flex flex-col">
      <DataTable
        columns={rfidScanColumns}
        data={scans}
        searchPlaceholder="Buscar EPC, SKU, color, talla o folio..."
        getRowId={(row) => String(row.id)}
        // El cuerpo llena el contenedor de altura acotada que da
        // `wms/rfid-scanner/page.tsx`, en vez de reservar un alto fijo.
        fillHeight
        onRefetch={handleRefetch}
        isRefetching={isManualRefetching}
        actionButton={
          <div className="flex items-center gap-2">
            {canClearScans && (
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
                    variant="danger"
                    onClick={() => setIsClearOpen(true)}
                    disabled={isClearing || hasNothingToClear}
                    className={hasNothingToClear ? "pointer-events-none!" : undefined}
                    leftIcon={<DeleteIcon className="w-4 h-4" />}
                  >
                    {isClearing ? "Limpiando..." : "Limpiar lecturas"}
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
                  description="Se eliminarán todas las lecturas RFID de todas las empresas y sucursales. Esta acción no se puede deshacer."
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
            <Button
              variant={isMonitoring ? "secondary" : "primary"}
              onClick={handleToggleMonitoring}
              leftIcon={
                isMonitoring ? (
                  <XIcon className="w-4 h-4" />
                ) : (
                  <ScanLineIcon className="w-4 h-4" />
                )
              }
            >
              {isMonitoring ? "Detener monitoreo" : "Iniciar monitoreo"}
            </Button>
          </div>
        }
        emptyMessage={
          isMonitoring
            ? "Sin lecturas todavía. Pasa una etiqueta frente a la antena."
            : "Monitoreo detenido. Inícialo para ver las lecturas en vivo."
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
