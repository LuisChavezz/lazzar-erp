"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { formatLocalDate } from "@/src/utils/formatDate";
import { getEstadoAsistenciaLabel } from "../constants/attendanceChoices";
import {
  justificationModeFor,
  type AttendanceRecordDialogsState,
} from "../hooks/useAttendanceRecordDialogs";
import type { AttendancePermissions } from "../hooks/useAttendanceRowActions";
import { useSetJustification } from "../hooks/useSetJustification";
import { useDeleteAttendance } from "../hooks/useDeleteAttendance";
import type { AttendanceRow } from "../utils/attendanceRows";
import { targetOf } from "../utils/attendanceRowTarget";
import { AttendanceCorrectionDialog } from "./AttendanceCorrectionDialog";
import { TimeTrackingDialog } from "@/src/features/time-tracking/components/TimeTrackingDialog";

interface AttendanceRecordDialogsProps {
  dialogs: AttendanceRecordDialogsState;
  permissions: AttendancePermissions;
}

const describe = (record: AttendanceRow) =>
  `${record.empleado_nombre} del ${formatLocalDate(record.fecha)}`;

/**
 * Diálogos sobre un registro existente, comunes al pase de lista y al
 * historial. El ESTADO vive en la vista (`useAttendanceRecordDialogs`); aquí
 * solo se pintan, y cada uno exige su permiso aunque el menú ya lo filtre.
 *
 * Corregir, justificar y eliminar trabajan con la copia del registro tomada al
 * ABRIR (`useDialogSession`): el texto no sigue a los refetch y sobrevive a la
 * animación de salida cuando su petición vuelve a `null`. Justificar y
 * eliminar no son optimistas: la confirmación queda abierta y bloqueada
 * (`busy`) hasta que el servidor responde y el listado se refresca.
 */
export function AttendanceRecordDialogs({ dialogs, permissions }: AttendanceRecordDialogsProps) {
  const { mutate: setJustification, isPending: isJustifying } = useSetJustification();
  const { mutate: deleteRecord, isPending: isDeleting } = useDeleteAttendance();
  // Guarda SÍNCRONA contra el doble clic en el mismo tick: `busy` llega hasta
  // el siguiente render.
  const inFlightRef = useRef(false);

  const runOnce = (run: (release: () => void) => void) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    run(() => {
      inFlightRef.current = false;
    });
  };

  const correctSession = useDialogSession(dialogs.isCorrectOpen, dialogs.correctTarget);
  // Sesión de corrección que ya terminó de cerrarse: deja de montarse (ver
  // `onExited`), como antes de EC-637. Abrir otra vez crea una sesión nueva.
  const [exitedCorrectId, setExitedCorrectId] = useState<number | null>(null);
  const justifySession = useDialogSession(dialogs.isJustifyOpen, dialogs.justifyTarget);
  const deleteSession = useDialogSession(dialogs.isDeleteOpen, dialogs.deleteTarget);

  const { breakdownTarget } = dialogs;
  const justifyRecord = justifySession.snapshot;
  // El sentido sale del estado de APERTURA: si cambia, la vista ya cerró el
  // diálogo (`getStaleAttendanceRecordNotice`).
  const isJustify = justifyRecord ? justificationModeFor(justifyRecord.estado) === "justificar" : true;

  return (
    <>
      {/* Sin permiso propio: consultar es de quien vea la fila; el diálogo
          decide qué acciones ofrece. Sigue a la asistencia VIGENTE. */}
      {breakdownTarget && (
        <TimeTrackingDialog
          key={`breakdown-${breakdownTarget.id}`}
          attendance={breakdownTarget}
          permissions={permissions}
          onClose={dialogs.closeBreakdown}
        />
      )}

      {permissions.canCapture && correctSession.snapshot && exitedCorrectId !== correctSession.id && (
        <AttendanceCorrectionDialog
          key={`correct-${correctSession.id}`}
          record={correctSession.snapshot}
          open={dialogs.isCorrectOpen}
          onExited={() => setExitedCorrectId(correctSession.id)}
          onClose={dialogs.closeCorrect}
          onFailed={dialogs.markCorrectionFailed}
        />
      )}

      {permissions.canManage && justifyRecord && justificationModeFor(justifyRecord.estado) && (
        <ConfirmDialog
          key={`justify-${justifySession.id}`}
          open={dialogs.isJustifyOpen}
          onOpenChange={(open) => {
            if (!open && !isJustifying) dialogs.closeJustification();
          }}
          title={isJustify ? "Justificar Asistencia" : "Quitar Justificación"}
          description={
            isJustify
              ? `El registro de ${describe(justifyRecord)} («${
                  getEstadoAsistenciaLabel(justifyRecord.estado) ?? justifyRecord.estado
                }») quedará como «Justificada». Sus horas no cambian, y la justificación se conserva aunque después se corrijan.`
              : `El registro de ${describe(justifyRecord)} dejará de estar justificado: el sistema volverá a calcular su estado (puntual, retardo o falta) a partir de sus horas.`
          }
          confirmText={
            isJustifying ? "Guardando…" : isJustify ? "Justificar" : "Quitar justificación"
          }
          confirmColor={isJustify ? "sky" : "amber"}
          closeOnConfirm={false}
          busy={isJustifying}
          onConfirm={() =>
            runOnce((release) =>
              setJustification(
                { target: targetOf(justifyRecord), justify: isJustify },
                {
                  onSettled: () => {
                    release();
                    dialogs.closeJustification();
                  },
                }
              )
            )
          }
        />
      )}

      {permissions.canManage && deleteSession.snapshot && (
        <ConfirmDialog
          key={`delete-${deleteSession.id}`}
          open={dialogs.isDeleteOpen}
          onOpenChange={(open) => {
            if (!open && !isDeleting) dialogs.closeDelete();
          }}
          title="Eliminar Registro de Asistencia"
          description={`Se eliminará definitivamente el registro de asistencia de ${describe(
            deleteSession.snapshot
          )}, con sus horas y observaciones. Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando…" : "Eliminar"}
          confirmColor="red"
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() => {
            const record = deleteSession.snapshot;
            if (!record) return;
            runOnce((release) =>
              deleteRecord(
                { target: targetOf(record) },
                {
                  onSettled: () => {
                    release();
                    dialogs.closeDelete();
                  },
                }
              )
            );
          }}
        />
      )}
    </>
  );
}
