"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useQualityInspectionOnboarding } from "../hooks/useQualityInspectionOnboarding";
import { getQualityInspectionColumns } from "./QualityInspectionColumns";
import { QualityInspectionDialog } from "./QualityInspectionDialog";
import type { QualityPendingReception } from "../interfaces/quality-inspection.interface";

/** Tope de `recepciones_pendientes` en el backend (`recepciones_qs[:50]`). */
const BACKEND_PENDING_LIMIT = 50;

export function QualityInspectionView() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQualityInspectionOnboarding();
  const recepciones = data?.recepciones_pendientes ?? [];
  const inspectores = data?.inspectores ?? [];

  // Ver la bandeja exige `R-WMS-CALIDAD` (ver `routePermissions`); registrar la
  // inspección exige además `C-WMS-CALIDAD`. El backend no valida ningún
  // permiso de Calidad: este control es solo de interfaz. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canSubmit = hasPermission("C-WMS-CALIDAD", session?.user);

  // El diálogo vive aquí, no en la celda: la fila desaparece del listado en
  // cuanto la inspección se registra (y el refetch la saca de `recepciones`).
  // Se guarda la fila completa para que el diálogo no dependa de que siga en
  // la lista mientras está abierto.
  const [selected, setSelected] = useState<QualityPendingReception | null>(null);
  // `setSelected` es estable y el React Compiler memoiza la llamada: las celdas
  // no se remontan entre renders.
  const columns = getQualityInspectionColumns({ onInspect: setSelected });

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      {recepciones.length >= BACKEND_PENDING_LIMIT && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Se muestran las {BACKEND_PENDING_LIMIT} recepciones más recientes en espera de calidad;
          las anteriores aparecerán conforme se inspeccionen estas.
        </p>
      )}

      <DataTable
        columns={columns}
        data={recepciones}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar recepción..."
        fillHeight
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar las recepciones en espera de calidad"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando recepciones en espera de calidad"
        emptyMessage="No hay recepciones en espera de calidad."
      />

      <QualityInspectionDialog
        reception={selected}
        inspectores={inspectores}
        canSubmit={canSubmit}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
