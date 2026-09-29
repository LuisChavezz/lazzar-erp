"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ESTADO_JUSTIFICADA,
  ESTADOS_JUSTIFICABLES,
  getEstadoAsistenciaLabel,
  type EstadoAsistencia,
} from "../constants/attendanceChoices";
import type { AttendanceRow } from "../utils/attendanceRows";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_GONE_MESSAGE } from "./attendanceErrorMessages";

export type JustificationMode = "justificar" | "quitar";

/** Qué cambio de justificación admite un estado, o `null` si ninguno (`puntual`). */
export const justificationModeFor = (estado: EstadoAsistencia): JustificationMode | null => {
  if (estado === ESTADO_JUSTIFICADA) {
    return "quitar";
  }
  return ESTADOS_JUSTIFICABLES.includes(estado) ? "justificar" : null;
};

/**
 * Estado de los diálogos sobre un registro existente (desglose de horas,
 * corregir, justificar o quitar la justificación, eliminar), compartido por el
 * pase de lista y el historial, y ÚNICO mecanismo de aviso de "diálogo cerrado
 * porque el registro cambió" del módulo (`notifyStale`, que también usa la
 * checada con hora del pase de lista). Vive en la VISTA, nunca en una celda:
 * corregir o justificar cambia `estado` (un filtro del historial) y el pase de
 * lista reordena y oculta filas, así que la celda —con su diálogo— podría
 * desmontarse a media operación.
 *
 * Se guarda el ID (y, al justificar, el modo con que se abrió) y se resuelve
 * contra el listado vigente. Si un refetch muestra que el registro ya no existe
 * o que su estado ya no admite el cambio, el diálogo se cierra con un aviso,
 * salvo que:
 * - la mutación en vuelo sea la suya (entonces lo cierra su propio flujo), o
 * - su propia mutación ya FALLÓ (`markCorrectionFailed`): el toast de error ya
 *   explicó qué pasó, y un segundo aviso sobre lo mismo solo confunde.
 *
 * `canResolve` es `false` mientras el listado no corresponde al filtro actual
 * (cargando o con `placeholderData`): ahí la ausencia de una fila no significa
 * nada.
 */
export function useAttendanceRecordDialogs(
  rows: readonly AttendanceRow[],
  pending: readonly AttendanceRowTarget[],
  canResolve: boolean
) {
  // `failed`: la corrección de este diálogo ya falló al menos una vez (el
  // diálogo sigue abierto para reintentar con los errores bajo sus campos).
  const [correctRequest, setCorrectRequest] = useState<{ id: number; failed: boolean } | null>(
    null
  );
  const [justifyRequest, setJustifyRequest] = useState<{
    id: number;
    mode: JustificationMode;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // El desglose se resuelve contra el listado en cada render: el diálogo
  // siempre ve la asistencia VIGENTE (sus límites y si aún tiene entrada).
  const [breakdownId, setBreakdownId] = useState<number | null>(null);
  // Aviso pendiente del cierre por datos obsoletos. Se muestra desde un efecto:
  // un toast en pleno render actualizaría otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<{ key: string; message: string } | null>(null);

  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;
  const isPending = (id: number) => pending.some((target) => target.id === id);

  const correctTarget = findRow(correctRequest?.id ?? null);
  const justifyTarget = findRow(justifyRequest?.id ?? null);
  const deleteTarget = findRow(deleteId);
  const breakdownTarget = findRow(breakdownId);

  /**
   * Programa el aviso de un diálogo cerrado por datos obsoletos. `key` estable
   * por caso: un doble render no duplica el toast.
   */
  const notifyStale = (key: string, message: string) => setStaleNotice({ key, message });

  // Ajustes en RENDER, no en un efecto (`react-hooks/set-state-in-effect`).
  if (canResolve) {
    if (correctRequest !== null && correctTarget === null && !isPending(correctRequest.id)) {
      setCorrectRequest(null);
      if (!correctRequest.failed) {
        notifyStale(`attendance-gone-${correctRequest.id}`, ATTENDANCE_GONE_MESSAGE);
      }
    }
    if (justifyRequest !== null && !isPending(justifyRequest.id)) {
      if (justifyTarget === null) {
        setJustifyRequest(null);
        notifyStale(`attendance-gone-${justifyRequest.id}`, ATTENDANCE_GONE_MESSAGE);
      } else if (justificationModeFor(justifyTarget.estado) !== justifyRequest.mode) {
        setJustifyRequest(null);
        notifyStale(
          `attendance-estado-${justifyRequest.id}-${justifyTarget.estado}`,
          `El registro cambió de estado (ahora: «${
            getEstadoAsistenciaLabel(justifyTarget.estado) ?? justifyTarget.estado
          }»). Se actualizó el listado.`
        );
      }
    }
    if (deleteId !== null && deleteTarget === null && !isPending(deleteId)) {
      setDeleteId(null);
      notifyStale(`attendance-gone-${deleteId}`, ATTENDANCE_GONE_MESSAGE);
    }
    if (breakdownId !== null && breakdownTarget === null && !isPending(breakdownId)) {
      setBreakdownId(null);
      notifyStale(`attendance-gone-${breakdownId}`, ATTENDANCE_GONE_MESSAGE);
    }
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  return {
    correctTarget,
    justifyTarget,
    justifyMode: justifyRequest?.mode ?? null,
    deleteTarget,
    breakdownTarget,
    notifyStale,
    openBreakdown: (record: AttendanceRow) => setBreakdownId(record.id),
    closeBreakdown: () => setBreakdownId(null),
    openCorrect: (record: AttendanceRow) => setCorrectRequest({ id: record.id, failed: false }),
    openJustification: (record: AttendanceRow) => {
      const mode = justificationModeFor(record.estado);
      if (mode) {
        setJustifyRequest({ id: record.id, mode });
      }
    },
    openDelete: (record: AttendanceRow) => setDeleteId(record.id),
    /** La corrección abierta falló: un cierre posterior por datos obsoletos va sin aviso. */
    markCorrectionFailed: () =>
      setCorrectRequest((current) => (current ? { ...current, failed: true } : current)),
    closeCorrect: () => setCorrectRequest(null),
    closeJustification: () => setJustifyRequest(null),
    closeDelete: () => setDeleteId(null),
  };
}

export type AttendanceRecordDialogsState = ReturnType<typeof useAttendanceRecordDialogs>;
