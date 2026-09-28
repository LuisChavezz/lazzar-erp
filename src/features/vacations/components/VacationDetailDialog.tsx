"use client";

import { VacationIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  ESTADO_RECHAZADO,
  ESTADO_VACACION_CFG,
} from "../constants/vacationChoices";
import { countCalendarDays } from "../utils/workingDays";
import { formatVacationRange, type VacationRow } from "./VacationColumns";

const SIN_REGISTRO = "Sin registro";

/** Fecha y hora de un datetime ISO, o "Sin registro". */
const formatDateTime = (value: string | null) =>
  value ? `${formatShortDate(value)} · ${formatShortTime(value)}` : SIN_REGISTRO;

/** Texto tenue para los huecos de trazabilidad. */
const Muted = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-400 dark:text-slate-500 italic font-normal">{children}</span>
);

const nameOrMissing = (name: string | null) => (name ? name : <Muted>{SIN_REGISTRO}</Muted>);
const dateTimeOrMissing = (value: string | null) =>
  value ? formatDateTime(value) : <Muted>{SIN_REGISTRO}</Muted>;

interface VacationDetailDialogProps {
  /**
   * La solicitud YA cargada por el listado, con sus nombres resueltos: sin
   * fetch propio, porque listado y detalle comparten la misma forma
   * (`VacacionesSerializer`, `fields = '__all__'`, confirmado contra el
   * checkout de `nucleo-erp`).
   */
  vacation: VacationRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de una solicitud de vacaciones: el periodo y su trazabilidad (quién
 * la capturó, quién la aprobó o rechazó y cuándo). No hay bloqueo de
 * autoaprobación (D3): el detalle lo hace visible.
 *
 * Tolera los datos heredados: una aprobada sin `autorizado_por` ni
 * `fecha_aprobacion` (aprobada por PATCH de `estado`) y un `motivo_rechazo`
 * vacío (`""` en vez de `null`). `dias_disponibles_al_momento` no se muestra
 * (saldo fuera de alcance, D7).
 */
export function VacationDetailDialog({ vacation, open, onOpenChange }: VacationDetailDialogProps) {
  const calendarDays = countCalendarDays(vacation.fecha_inicio, vacation.fecha_fin);
  const isApproved = vacation.estado === ESTADO_APROBADO;
  const isRejected = vacation.estado === ESTADO_RECHAZADO;
  // Un rastro de aprobación o rechazo se muestra aunque el estado ya no lo
  // explique (datos editados fuera del flujo).
  const showApproval = isApproved || vacation.autorizado_por !== null || vacation.fecha_aprobacion !== null;
  const showRejection = isRejected || vacation.rechazado_por !== null || vacation.fecha_rechazo !== null;
  const approvalWithoutTrace =
    isApproved && vacation.autorizado_por === null && vacation.fecha_aprobacion === null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <VacationIcon className="w-5 h-5 text-cyan-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Vacaciones
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {vacation.empleado_nombre}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Empleado">{vacation.empleado_nombre}</InfoField>
          <InfoField label="Estado">
            <StatusBadge status={vacation.estado} config={ESTADO_VACACION_CFG} />
          </InfoField>
          <InfoField label="Periodo">
            <span className="tabular-nums">{formatVacationRange(vacation)}</span>
          </InfoField>
          <InfoField label="Días solicitados">
            <span className="tabular-nums">{vacation.dias_solicitados}</span>
          </InfoField>
          <InfoField label="Días calendario">
            <span className="tabular-nums">{calendarDays ?? "—"}</span>
          </InfoField>
          <InfoField label="Motivo" className="col-span-2 sm:col-span-3">
            <span className="whitespace-pre-line">{textOrDash(vacation.motivo)}</span>
          </InfoField>
        </div>

        {/* Trazabilidad */}
        <div>
          <SectionTitle>Trazabilidad</SectionTitle>
          <div className="px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
            <InfoGrid>
              <InfoField label="Capturada por">{nameOrMissing(vacation.solicitado_por_nombre)}</InfoField>
              <InfoField label="Fecha de solicitud">
                {dateTimeOrMissing(vacation.fecha_solicitud)}
              </InfoField>
            </InfoGrid>

            {showApproval && (
              <InfoGrid>
                <InfoField label="Aprobada por">{nameOrMissing(vacation.autorizado_por_nombre)}</InfoField>
                <InfoField label="Fecha de aprobación">
                  {dateTimeOrMissing(vacation.fecha_aprobacion)}
                </InfoField>
              </InfoGrid>
            )}
            {approvalWithoutTrace && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Esta solicitud figura como aprobada, pero no quedó registro de quién la aprobó ni
                cuándo: se aprobó fuera del flujo de aprobación.
              </p>
            )}

            {showRejection && (
              <InfoGrid>
                <InfoField label="Rechazada por">{nameOrMissing(vacation.rechazado_por_nombre)}</InfoField>
                <InfoField label="Fecha de rechazo">{dateTimeOrMissing(vacation.fecha_rechazo)}</InfoField>
                <InfoField label="Motivo de rechazo" className="col-span-2 md:col-span-3">
                  <span className="whitespace-pre-line">{textOrDash(vacation.motivo_rechazo)}</span>
                </InfoField>
              </InfoGrid>
            )}

            {vacation.estado === ESTADO_PENDIENTE && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pendiente de aprobación.
              </p>
            )}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
