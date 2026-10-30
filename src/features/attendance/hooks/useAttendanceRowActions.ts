"use client";

import { useMutationState } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { AttendanceRow, RollCallRow } from "../utils/attendanceRows";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { registerEntryMutationKey, registerExitMutationKey } from "./useCheckIn";
import { markAbsenceMutationKey } from "./useMarkAbsence";
import { correctAttendanceMutationKey } from "./useCorrectAttendance";
import { setJustificationMutationKey } from "./useSetJustification";
import { deleteAttendanceMutationKey } from "./useDeleteAttendance";

/**
 * Matriz de permisos del módulo (solo en cliente: el backend no tiene RBAC en
 * asistencias). `R-RH` para ver lo exige la ruta.
 *
 * - `canCapture` (`E-RH`): checar entrada/salida, marcar falta, corregir horas
 *   y observaciones. NUNCA cambia `estado`.
 * - `canManage` (`D-RH`): justificar, quitar la justificación y eliminar.
 */
export interface AttendancePermissions {
  canCapture: boolean;
  canManage: boolean;
}

export function useAttendancePermissions(): AttendancePermissions {
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  return {
    canCapture: hasPermission("E-RH", session?.user),
    canManage: hasPermission("D-RH", session?.user),
  };
}

// ─── Contexto para los menús de fila ──────────────────────────────────────────
// Los callbacks y el "en vuelo" llegan al menú por contexto
// (`createRowActionsContext`), NO por la factoría de columnas. Los diálogos
// viven en la vista.

/** Acciones sobre un registro existente (ambas pestañas). */
export interface AttendanceRecordActions {
  /** "Desglose de horas" (control de horas): lo abre cualquiera que vea la fila. */
  onOpenBreakdown: (record: AttendanceRow) => void;
  onCorrect: (record: AttendanceRow) => void;
  /** Justificar o quitar la justificación, según el estado del registro. */
  onToggleJustification: (record: AttendanceRow) => void;
  onDelete: (record: AttendanceRow) => void;
}

/** Acciones del checador: solo en el pase de lista. */
export interface AttendanceCheckInActions {
  onRegisterEntry: (row: RollCallRow) => void;
  onRegisterExit: (row: RollCallRow) => void;
  onMarkAbsence: (row: RollCallRow) => void;
}

export interface AttendanceRowActionsContextValue {
  record: AttendanceRecordActions;
  /** `null` fuera del pase de lista (el historial no checa). */
  checkIn: AttendanceCheckInActions | null;
  /** Filas con una mutación en vuelo (`usePendingAttendanceTargets`, calculado en la vista). */
  pending: AttendanceRowTarget[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<AttendanceRowActionsContextValue>(
    "AttendanceNameCell",
    "RollCallView / AttendanceHistoryView"
  );

/** Callbacks y "en vuelo" de los menús de fila; ver `createRowActionsContext`. */
export const AttendanceRowActionsProvider = Provider;
export const useAttendanceRowActionsContext = useRowActionsContext;

/** Primer segmento de la clave de cada mutación del módulo. */
const ROW_MUTATION_KEYS = new Set<unknown>([
  registerEntryMutationKey[0],
  registerExitMutationKey[0],
  markAbsenceMutationKey[0],
  correctAttendanceMutationKey[0],
  setJustificationMutationKey[0],
  deleteAttendanceMutationKey[0],
]);

/**
 * Filas con una mutación EN CURSO, leídas de la `MutationCache` (cada
 * `useMutation` solo recuerda su última llamada). Todas las mutaciones del
 * módulo llevan `{ target }` en sus variables (ver `AttendanceRowTarget`).
 * Mientras una está en vuelo, el menú de esa fila deshabilita todas sus
 * acciones. UNA sola suscripción por vista.
 */
export function usePendingAttendanceTargets(): AttendanceRowTarget[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: (mutation) => (mutation.state.variables as { target: AttendanceRowTarget }).target,
  });
}
