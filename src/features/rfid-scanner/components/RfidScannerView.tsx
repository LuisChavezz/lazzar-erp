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

  const { scans, isLoading, isError, error, hasLoaded, refetch } =
    useRfidScans(isMonitoring);
  const {
    stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useRfidScannerStats();
  const { mutate: clearScans, isPending: isClearing } = useClearRfidScans();

  // La purga se rige por `D-WMS-SCANNER` del catálogo de permisos, igual que
  // el resto de acciones de la app. `hasPermission` ya cortocircuita para el
  // rol "admin". Esto es solo UX: la frontera real es el backend, que responde
  // 403 con su propio mensaje si rechaza la llamada.
  const { data: session } = useSession();
  const canClearScans = hasPermission("D-WMS-SCANNER", session?.user);

  const showError = isInitialLoadError(isError, hasLoaded);

  const handleToggleMonitoring = () => {
    const next = !isMonitoring;
    setIsMonitoring(next);
    // Al encender se revalida el estado del lector: `scanner-stats` no tiene
    // ciclo propio, así que sin esto la barra seguiría mostrando la foto del
    // montaje de la pantalla (ver `useRfidScannerStats`).
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
    <div className="space-y-6">
      <RfidScannerStats stats={stats} isLoading={isStatsLoading} />

      <DataTable
        columns={rfidScanColumns}
        data={scans}
        searchPlaceholder="Buscar EPC, SKU, color, talla o folio..."
        getRowId={(row) => String(row.id)}
        onRefetch={handleRefetch}
        isRefetching={isManualRefetching}
        actionButton={
          <div className="flex items-center gap-2">
            {canClearScans && (
              <>
                <Button
                  variant="danger"
                  onClick={() => setIsClearOpen(true)}
                  disabled={isClearing}
                  leftIcon={<DeleteIcon className="w-4 h-4" />}
                >
                  {isClearing ? "Limpiando..." : "Limpiar lecturas"}
                </Button>
                {/* Diálogo controlado por estado y NO por el `trigger` de
                    `ConfirmDialog`: el botón de arriba necesita su propio
                    `variant`/`leftIcon`/`disabled`, que el trigger no expone.
                    Mismo patrón que `ColorColumns`. */}
                <ConfirmDialog
                  open={isClearOpen}
                  onOpenChange={setIsClearOpen}
                  title="Limpiar lecturas RFID"
                  description="¿Eliminar todas las lecturas? Se borrarán TODAS las almacenadas, no solo las de esta sucursal. Esta acción no se puede deshacer."
                  confirmText={isClearing ? "Eliminando..." : "Eliminar"}
                  confirmColor="red"
                  onConfirm={() => {
                    clearScans();
                    setIsClearOpen(false);
                  }}
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
  );
}
