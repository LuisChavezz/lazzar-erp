"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { formatLocalDate } from "@/src/utils/formatDate";
import { getEstadoAsistenciaLabel } from "../constants/attendanceChoices";
import type { AttendanceRecordDialogsState } from "../hooks/useAttendanceRecordDialogs";
import type { AttendancePermissions } from "../hooks/useAttendanceRowActions";
import { useSetJustification } from "../hooks/useSetJustification";
import { useDeleteAttendance } from "../hooks/useDeleteAttendance";
import type { AttendanceRow } from "../utils/attendanceRows";
import { targetOf } from "../utils/attendanceRowTarget";
import { AttendanceCorrectionDialog } from "./AttendanceCorrectionDialog";

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
 * Justificar y eliminar no son optimistas: la confirmación queda abierta y
 * bloqueada (`busy`) hasta que el servidor responde y el listado se refresca.
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

  const { correctTarget, justifyTarget, justifyMode, deleteTarget } = dialogs;
  const isJustify = justifyMode === "justificar";

  return (
    <>
      {permissions.canCapture && correctTarget && (
        <AttendanceCorrectionDialog
          key={correctTarget.id}
          record={correctTarget}
          onClose={dialogs.closeCorrect}
          onFailed={dialogs.markCorrectionFailed}
        />
      )}

      {permissions.canManage && justifyTarget && justifyMode && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isJustifying) dialogs.closeJustification();
          }}
          title={isJustify ? "Justificar Asistencia" : "Quitar Justificación"}
          description={
            isJustify
              ? `El registro de ${describe(justifyTarget)} («${
                  getEstadoAsistenciaLabel(justifyTarget.estado) ?? justifyTarget.estado
                }») quedará como «Justificada». Sus horas no cambian, y la justificación se conserva aunque después se corrijan.`
              : `El registro de ${describe(justifyTarget)} dejará de estar justificado: el sistema volverá a calcular su estado (puntual, retardo o falta) a partir de sus horas.`
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
                { target: targetOf(justifyTarget), justify: isJustify },
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

      {permissions.canManage && deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isDeleting) dialogs.closeDelete();
          }}
          title="Eliminar Registro de Asistencia"
          description={`Se eliminará definitivamente el registro de asistencia de ${describe(
            deleteTarget
          )}, con sus horas y observaciones. Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando…" : "Eliminar"}
          confirmColor="red"
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() =>
            runOnce((release) =>
              deleteRecord(
                { target: targetOf(deleteTarget) },
                {
                  onSettled: () => {
                    release();
                    dialogs.closeDelete();
                  },
                }
              )
            )
          }
        />
      )}
    </>
  );
}
