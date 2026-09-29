"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { EmptyLines, InfoField, InfoGrid } from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM } from "@/src/utils/mexicoTime";
import type { AttendanceRow } from "@/src/features/attendance/utils/attendanceRows";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { useProductionOrders } from "@/src/features/production-orders/hooks/useProductionOrders";
import { TIPO_CONTROL_HORAS_CFG } from "../constants/timeTrackingChoices";
import type { TimeSegment } from "../interfaces/time-tracking.interface";
import { useTimeSegments } from "../hooks/useTimeSegments";
import { useDeleteTimeSegment } from "../hooks/useDeleteTimeSegment";
import { useIsTimeTrackingMutating } from "../hooks/useIsTimeTrackingMutating";
import { SEGMENT_GONE_MESSAGE, SEGMENT_GONE_TOAST_ID } from "../hooks/timeTrackingErrorMessages";
import { computeBreakdownTotals } from "../utils/breakdownTotals";
import { indexOrders } from "../utils/productionOrderOptions";
import {
  getAttendanceBounds,
  getCutoffMs,
  getSegmentIssues,
  instantToDateKey,
  instantToHHMM,
} from "../utils/segmentTime";
import { TimeSegmentForm } from "./TimeSegmentForm";
import { TimeSegmentsTable } from "./TimeSegmentsTable";
import { TimeTrackingTotals } from "./TimeTrackingTotals";

/** Lo que el desglose lee de la asistencia (una fila de asistencia ya lo trae). */
export type BreakdownAttendanceRow = Pick<
  AttendanceRow,
  | "id"
  | "empleado"
  | "fecha"
  | "turno"
  | "hora_entrada"
  | "hora_salida"
  | "horas_normales"
  | "horas_extra"
  | "empleado_nombre"
  | "turno_nombre"
>;

interface TimeTrackingDialogProps {
  /**
   * Asistencia VIGENTE: el padre la resuelve en cada render contra su listado,
   * así que límites, corte y modo "solo eliminar" siguen al registro aunque
   * cambie con el diálogo abierto.
   */
  attendance: BreakdownAttendanceRow;
  permissions: { canCapture: boolean; canManage: boolean };
  onClose: () => void;
}

const NO_ENTRY_MESSAGE =
  "Esta asistencia no tiene hora de entrada: no se puede desglosar hasta que se restaure la entrada.";

const describeSegment = (segment: TimeSegment) =>
  `${getMexicoTimeHHMM(segment.hora_inicio) || "—"}–${
    getMexicoTimeHHMM(segment.hora_fin) || "sin fin"
  } (${TIPO_CONTROL_HORAS_CFG[segment.tipo]?.label ?? segment.tipo})`;

/**
 * "Desglose de horas" de UNA asistencia: sus tramos por OP o tarea, con alta,
 * edición y borrado.
 *
 * - Permisos (los de asistencia): `E-RH` agrega y edita; `D-RH` elimina (con
 *   confirmación). Cualquiera que vea la fila puede consultar el desglose.
 * - Sin hora de entrada (al abrir o perdida con el diálogo abierto; se evalúa
 *   en CADA render): no hay alta ni edición, sin importar los permisos; con
 *   `D-RH` los tramos existentes solo se pueden eliminar. Una edición en curso
 *   se descarta.
 * - Los tramos inconsistentes (fuera de la jornada, traslapados, sin fin) se
 *   señalan y nunca se modifican solos.
 * - La comparación de totales contra la asistencia es informativa.
 */
export function TimeTrackingDialog({ attendance, permissions, onClose }: TimeTrackingDialogProps) {
  const { segments, hasLoaded, isInitialError, error, refetch, isFetching } =
    useTimeSegments(attendance);
  const { shifts, isLoading: isLoadingShifts, isError: isShiftsError } = useShifts();
  const {
    data: orders,
    hasLoaded: ordersLoaded,
    isError: isOrdersError,
  } = useProductionOrders();
  const isMutating = useIsTimeTrackingMutating();
  const { mutate: deleteSegment, isPending: isDeleting } = useDeleteTimeSegment();
  // Guarda SÍNCRONA contra el doble clic en el mismo tick: `busy` llega hasta
  // el siguiente render.
  const inFlightRef = useRef(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // Remonta el formulario de alta tras cada tramo guardado (vuelve a partir
  // del listado nuevo).
  const [createKey, setCreateKey] = useState(0);
  // Aviso de "el tramo ya no existe" pendiente; se muestra desde un efecto (un
  // toast en pleno render actualizaría otro componente). Cada aviso es un
  // objeto nuevo, así que el efecto corre una vez por aviso.
  const [goneNotice, setGoneNotice] = useState<object | null>(null);

  const bounds = getAttendanceBounds(attendance);
  const { entryMs } = bounds;
  const canBreakDown = entryMs !== null;
  const canEdit = canBreakDown && permissions.canCapture;
  // Turno de la ASISTENCIA (no el actual del empleado).
  const shift = shifts.find((item) => item.id === attendance.turno);
  const cutoffMs = getCutoffMs(entryMs, shift?.horas_base_diarias);

  const editing = editingId !== null ? (segments.find((s) => s.id === editingId) ?? null) : null;
  const deleteTarget =
    deleteId !== null ? (segments.find((s) => s.id === deleteId) ?? null) : null;
  // "Asentado" = listado cargado y sin petición en vuelo: solo entonces la
  // ausencia de un tramo significa que ya no existe.
  const listSettled = hasLoaded && !isFetching;

  // Ajustes en RENDER, no en un efecto.
  if (editingId !== null) {
    if (!canEdit) {
      // Sin entrada (o sin permiso) no se edita: la edición se descarta.
      setEditingId(null);
    } else if (listSettled && editing === null && !isMutating) {
      // Otra persona lo borró.
      setEditingId(null);
      setGoneNotice({});
    }
  }
  if (deleteId !== null && listSettled && deleteTarget === null && !isDeleting) {
    setDeleteId(null);
    setGoneNotice({});
  }

  useEffect(() => {
    // Mismo id que el toast del 404 de la propia mutación: si ambos
    // describen el mismo tramo, se ve UN aviso.
    if (goneNotice) {
      toast.error(SEGMENT_GONE_MESSAGE, { id: SEGMENT_GONE_TOAST_ID });
    }
  }, [goneNotice]);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media escritura: el resultado debe verse.
    if (!next && !isMutating) onClose();
  };

  const runOnce = (run: (release: () => void) => void) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    run(() => {
      inFlightRef.current = false;
    });
  };

  const issuesById = new Map(
    segments.map((segment) => [
      segment.id,
      getSegmentIssues(segment, segments, attendance.fecha, bounds),
    ])
  );
  const hasIssues = [...issuesById.values()].some((issues) => issues.length > 0);
  const orderById = indexOrders(orders ?? []);

  const cutoffLabel =
    cutoffMs === null
      ? "—"
      : `${instantToHHMM(cutoffMs)}${
          instantToDateKey(cutoffMs) !== attendance.fecha ? " (día siguiente)" : ""
        }`;
  const cutoffHint =
    !canBreakDown || cutoffMs !== null || isLoadingShifts
      ? null
      : isShiftsError
        ? "No se pudo cargar el catálogo de turnos: no se sugiere el tipo de cada tramo."
        : !shift
          ? "El turno de la asistencia no está en el catálogo de turnos: no se sugiere el tipo de cada tramo."
          : "El turno de la asistencia no define horas base diarias: no se sugiere el tipo de cada tramo.";
  const noEntryMessage =
    permissions.canManage && segments.length > 0
      ? `${NO_ENTRY_MESSAGE} Mientras tanto, sus tramos solo se pueden eliminar.`
      : NO_ENTRY_MESSAGE;

  let body: ReactNode;
  if (isInitialError) {
    body = (
      <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
        <p>{extractErrorMessage(error, "No se pudieron cargar los tramos de esta asistencia.")}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-xs font-medium underline cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  } else if (!hasLoaded) {
    body = <EmptyLines>Cargando tramos…</EmptyLines>;
  } else if (segments.length === 0) {
    // Sin tramos: el estado vacío explica también el caso sin entrada.
    body = (
      <EmptyLines>{canBreakDown ? "Esta asistencia aún no tiene tramos." : noEntryMessage}</EmptyLines>
    );
  } else {
    body = (
      <div className="space-y-3">
        {!canBreakDown && <Notice>{noEntryMessage}</Notice>}
        {hasIssues && (
          <Notice>
            Hay tramos marcados con inconsistencias. No se corrigen solos: revísalos y edítalos o
            elimínalos.
          </Notice>
        )}
        <TimeSegmentsTable
          segments={segments}
          issuesById={issuesById}
          orderById={orderById}
          ordersLoaded={ordersLoaded}
          editingId={editingId}
          canEdit={canEdit}
          canDelete={permissions.canManage}
          busy={isMutating}
          onEdit={(segment) => setEditingId(segment.id)}
          onDelete={(segment) => setDeleteId(segment.id)}
        />
        <TimeTrackingTotals
          totals={computeBreakdownTotals(segments)}
          horasNormales={attendance.horas_normales}
          horasExtra={attendance.horas_extra}
          horaEntrada={attendance.hora_entrada}
          horaSalida={attendance.hora_salida}
        />
      </div>
    );
  }

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="900px"
      title="Desglose de Horas"
      description={`${attendance.empleado_nombre} · ${formatLocalDate(
        attendance.fecha
      )}. Tramos de trabajo por OP o tarea, en hora de México.`}
    >
      <div className="space-y-4 py-1">
        <div className="space-y-2">
          <InfoGrid>
            <InfoField label="Empleado">{attendance.empleado_nombre}</InfoField>
            <InfoField label="Fecha">{formatLocalDate(attendance.fecha)}</InfoField>
            <InfoField label="Turno">{attendance.turno_nombre}</InfoField>
            <InfoField label="Entrada">
              {getMexicoTimeHHMM(attendance.hora_entrada) || "—"}
            </InfoField>
            <InfoField label="Salida">{getMexicoTimeHHMM(attendance.hora_salida) || "—"}</InfoField>
            <InfoField label="Corte de horas extra">{cutoffLabel}</InfoField>
          </InfoGrid>
          {cutoffHint && <p className="text-[11px] text-slate-400">{cutoffHint}</p>}
        </div>

        {body}

        {/* Alta o edición: solo con entrada, con `E-RH` y con el listado
            cargado (los traslapes se validan contra él). */}
        {entryMs !== null &&
          permissions.canCapture &&
          hasLoaded &&
          !isInitialError &&
          (editing ? (
            <TimeSegmentForm
              key={`edit-${editing.id}`}
              attendance={attendance}
              bounds={{ entryMs, exitMs: bounds.exitMs }}
              segments={segments}
              cutoffMs={cutoffMs}
              segment={editing}
              orders={orders ?? []}
              ordersLoaded={ordersLoaded}
              ordersError={isOrdersError}
              disabled={isMutating}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TimeSegmentForm
              key={`create-${createKey}`}
              attendance={attendance}
              bounds={{ entryMs, exitMs: bounds.exitMs }}
              segments={segments}
              cutoffMs={cutoffMs}
              segment={null}
              orders={orders ?? []}
              ordersLoaded={ordersLoaded}
              ordersError={isOrdersError}
              disabled={isMutating}
              onDone={() => setCreateKey((current) => current + 1)}
            />
          ))}
      </div>

      {permissions.canManage && deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteId(null);
          }}
          title="Eliminar Tramo"
          description={`Se eliminará definitivamente el tramo de ${describeSegment(
            deleteTarget
          )}. Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando…" : "Eliminar"}
          confirmColor="red"
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() =>
            runOnce((release) =>
              deleteSegment(
                { id: deleteTarget.id },
                {
                  onSettled: () => {
                    release();
                    setDeleteId(null);
                  },
                }
              )
            )
          }
        />
      )}
    </MainDialog>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      {children}
    </p>
  );
}
