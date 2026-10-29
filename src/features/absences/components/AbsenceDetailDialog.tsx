"use client";

import { AbsenceIcon } from "@/src/components/Icons";
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
  getAusenciaVocabulary,
  getEstadoAusenciaCfg,
  getTipoAusenciaLabel,
} from "../constants/absenceChoices";
import { formatAbsenceRange, goceLabel, type AbsenceRow } from "./AbsenceColumns";

const SIN_REGISTRO = "Sin registro";

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-400 dark:text-slate-500 italic font-normal">{children}</span>
);

const nameOrMissing = (name: string | null) => (name ? name : <Muted>{SIN_REGISTRO}</Muted>);
const dateTimeOrMissing = (value: string | null) =>
  value ? `${formatShortDate(value)} · ${formatShortTime(value)}` : <Muted>{SIN_REGISTRO}</Muted>;

interface AbsenceDetailDialogProps {
  /**
   * El registro YA cargado por el listado, con sus nombres resueltos: sin fetch
   * propio, porque listado y detalle comparten la misma forma
   * (`PermisoAusenciaSerializer`, `fields = '__all__'`).
   */
  absence: AbsenceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un permiso/ausencia: periodo, tipo, goce y trazabilidad (quién lo
 * capturó y quién lo resolvió, y cuándo). No hay bloqueo de autoaprobación: el
 * detalle lo hace visible. Los rótulos siguen el vocabulario del tipo (una
 * falta se "confirma" y se "descarta"). Mismo esquema que el detalle de
 * vacaciones, incluida la tolerancia a datos heredados.
 */
export function AbsenceDetailDialog({ absence, open, onOpenChange }: AbsenceDetailDialogProps) {
  const vocabulary = getAusenciaVocabulary(absence.tipo);
  const isApproved = absence.estado === ESTADO_APROBADO;
  const isRejected = absence.estado === ESTADO_RECHAZADO;
  const showApproval = isApproved || absence.autorizado_por !== null || absence.fecha_aprobacion !== null;
  const showRejection = isRejected || absence.rechazado_por !== null || absence.fecha_rechazo !== null;
  const approvalWithoutTrace =
    isApproved && absence.autorizado_por === null && absence.fecha_aprobacion === null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={true}
      title={
        <DialogHeader
          title={`Detalle de ${getTipoAusenciaLabel(absence.tipo) ?? "Ausencia"}`}
          subtitle={absence.empleado_nombre}
          statusColor="orange"
          icon={AbsenceIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir el registro. */}
        <InfoTileGrid>
          <InfoTile label="Empleado">{absence.empleado_nombre}</InfoTile>
          <InfoTile label="Tipo">{getTipoAusenciaLabel(absence.tipo) ?? absence.tipo}</InfoTile>
          <InfoTile label="Estado">
            <StatusBadge status={absence.estado} config={getEstadoAusenciaCfg(absence.tipo)} />
          </InfoTile>
          <InfoTile label="Periodo">
            <span className="tabular-nums">{formatAbsenceRange(absence)}</span>
          </InfoTile>
          <InfoTile label="Goce de sueldo">{goceLabel(absence.con_goce_sueldo)}</InfoTile>
        </InfoTileGrid>

        <div className="text-xs px-1">
          <InfoField label="Motivo">
            <span className="whitespace-pre-line">{textOrDash(absence.motivo)}</span>
          </InfoField>
        </div>

        <div>
          <SectionTitle>Trazabilidad</SectionTitle>
          <div className="px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 space-y-4">
            <InfoGrid>
              <InfoField label="Capturado por">{nameOrMissing(absence.solicitado_por_nombre)}</InfoField>
              <InfoField label="Fecha de registro">{dateTimeOrMissing(absence.fecha_solicitud)}</InfoField>
            </InfoGrid>

            {showApproval && (
              <InfoGrid>
                <InfoField label={vocabulary.approvedByLabel}>
                  {nameOrMissing(absence.autorizado_por_nombre)}
                </InfoField>
                <InfoField label={vocabulary.approvedAtLabel}>
                  {dateTimeOrMissing(absence.fecha_aprobacion)}
                </InfoField>
              </InfoGrid>
            )}
            {approvalWithoutTrace && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Este registro figura como {vocabulary.estadoLabel.aprobado.toLowerCase()}, pero no
                quedó registro de quién lo resolvió ni cuándo: se cambió fuera del flujo.
              </p>
            )}

            {showRejection && (
              <InfoGrid>
                <InfoField label={vocabulary.rejectedByLabel}>
                  {nameOrMissing(absence.rechazado_por_nombre)}
                </InfoField>
                <InfoField label={vocabulary.rejectedAtLabel}>
                  {dateTimeOrMissing(absence.fecha_rechazo)}
                </InfoField>
                <InfoField label={vocabulary.rejectReasonLabel} className="col-span-2 md:col-span-3">
                  <span className="whitespace-pre-line">{textOrDash(absence.motivo_rechazo)}</span>
                </InfoField>
              </InfoGrid>
            )}

            {absence.estado === ESTADO_PENDIENTE && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {vocabulary.pendingLabel}.
              </p>
            )}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
