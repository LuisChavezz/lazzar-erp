"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import {
  ESTADO_JUSTIFICADA,
  ESTADOS_JUSTIFICABLES,
  type EstadoAsistencia,
} from "../constants/attendanceChoices";
import type { AttendanceRow } from "../utils/attendanceRows";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { getStaleAttendanceRecordNotice } from "../utils/attendanceStaleDialogs";

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
 * corregir o justificar cambia `estado` (un filtro) y el pase de lista
 * reordena y oculta filas, así que la celda —con su diálogo— podría
 * desmontarse a media operación.
 *
 * Se guarda el ID (y, al justificar, el estado con que se abrió) y se resuelve
 * contra el listado COMPLETO de la vista. La regla de cierre es
 * `getStaleAttendanceRecordNotice`: si un refetch muestra que el registro ya
 * no existe o que su estado ya no es el de la apertura, el diálogo se cierra
 * con un aviso, salvo que:
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
    estado: EstadoAsistencia;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // El desglose se resuelve contra el listado en cada render: el diálogo
  // siempre ve la asistencia VIGENTE (sus límites y si aún tiene entrada).
  const [breakdownId, setBreakdownId] = useState<number | null>(null);
  // Aviso pendiente del cierre por datos obsoletos. Se muestra desde un efecto:
  // un toast en pleno render actualizaría otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);

  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;
  const isPending = (id: number | null) =>
    id !== null && pending.some((target) => target.id === id);

  const correctId = correctRequest?.id ?? null;
  const justifyId = justifyRequest?.id ?? null;
  const correctTarget = findRow(correctId);
  const justifyTarget = findRow(justifyId);
  const deleteTarget = findRow(deleteId);
  const breakdownTarget = findRow(breakdownId);

  /**
   * Programa el aviso de un diálogo cerrado por datos obsoletos. `key` estable
   * por caso: un doble render no duplica el toast.
   */
  const notifyStale = (notice: StaleRowDialogNotice) => setStaleNotice(notice);

  // Ajustes en RENDER, no en un efecto (`react-hooks/set-state-in-effect`).
  const staleCorrect = getStaleAttendanceRecordNotice({
    targetId: correctId,
    target: correctTarget,
    isBusy: isPending(correctId),
    canResolve,
  });
  if (staleCorrect) {
    setCorrectRequest(null);
    if (!correctRequest?.failed) notifyStale(staleCorrect);
  }
  const staleJustify = getStaleAttendanceRecordNotice({
    targetId: justifyId,
    target: justifyTarget,
    expectedEstado: justifyRequest?.estado,
    isBusy: isPending(justifyId),
    canResolve,
  });
  if (staleJustify) {
    setJustifyRequest(null);
    notifyStale(staleJustify);
  }
  const staleDelete = getStaleAttendanceRecordNotice({
    targetId: deleteId,
    target: deleteTarget,
    isBusy: isPending(deleteId),
    canResolve,
  });
  if (staleDelete) {
    setDeleteId(null);
    notifyStale(staleDelete);
  }
  const staleBreakdown = getStaleAttendanceRecordNotice({
    targetId: breakdownId,
    target: breakdownTarget,
    isBusy: isPending(breakdownId),
    canResolve,
  });
  if (staleBreakdown) {
    setBreakdownId(null);
    notifyStale(staleBreakdown);
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  return {
    /** Abierto = hay petición; el registro (`*Target`) puede faltar un instante al cerrarse. */
    isCorrectOpen: correctRequest !== null,
    isJustifyOpen: justifyRequest !== null,
    isDeleteOpen: deleteId !== null,
    correctTarget,
    justifyTarget,
    deleteTarget,
    breakdownTarget,
    notifyStale,
    openBreakdown: (record: AttendanceRow) => setBreakdownId(record.id),
    closeBreakdown: () => setBreakdownId(null),
    openCorrect: (record: AttendanceRow) => setCorrectRequest({ id: record.id, failed: false }),
    openJustification: (record: AttendanceRow) => {
      if (justificationModeFor(record.estado)) {
        setJustifyRequest({ id: record.id, estado: record.estado });
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
