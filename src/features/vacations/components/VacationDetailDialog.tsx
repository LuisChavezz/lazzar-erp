"use client";

import { VacationIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  InfoGrid,
  InfoTile,
  InfoTileGrid,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
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
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle de Vacaciones"
          subtitle={vacation.empleado_nombre}
          statusColor="sky"
          icon={VacationIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir la solicitud. */}
        <InfoTileGrid>
          <InfoTile label="Empleado">{vacation.empleado_nombre}</InfoTile>
          <InfoTile label="Estado">
            <StatusBadge status={vacation.estado} config={ESTADO_VACACION_CFG} />
          </InfoTile>
          <InfoTile label="Periodo">
            <span className="tabular-nums">{formatVacationRange(vacation)}</span>
          </InfoTile>
          <InfoTile label="Días solicitados">
            <span className="tabular-nums">{vacation.dias_solicitados}</span>
          </InfoTile>
          <InfoTile label="Días calendario">
            <span className="tabular-nums">{calendarDays ?? "—"}</span>
          </InfoTile>
        </InfoTileGrid>

        <div className="text-xs px-1">
          <InfoField label="Motivo">
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
