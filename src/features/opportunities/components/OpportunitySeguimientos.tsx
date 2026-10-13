"use client";

import type { ComponentType, SVGProps } from "react";
import { useSession } from "next-auth/react";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ActivityTimeline, ActivityTimelineItem } from "@/src/components/ActivityTimeline";
import { Button } from "@/src/components/Button";
import { EmptyLines, Section, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import {
  CommentIcon,
  DeleteIcon,
  EditIcon,
  EmailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  TasksIcon,
} from "@/src/components/Icons";
import { useCompanyAdminStatus } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { formatShortDate, formatShortDateTime, getLocalTodayDate } from "@/src/utils/formatDate";
import { ETAPA_PERDIDA } from "../constants/opportunityChoices";
import {
  SEGUIMIENTOS_ONBOARDING_LIMIT,
  type TipoSeguimiento,
} from "../constants/seguimientoChoices";
import type { Opportunity } from "../interfaces/opportunity.interface";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";
import {
  getRecordatorioStatus,
  getSeguimientoAuthorLabel,
  groupSeguimientos,
  isSeguimientoAuthor,
} from "../utils/seguimientos";

const TIPO_ICONS: Record<TipoSeguimiento, ComponentType<SVGProps<SVGSVGElement>>> = {
  Nota: CommentIcon,
  Llamada: PhoneIcon,
  Correo: EmailIcon,
  Visita: MapPinIcon,
  Tarea: TasksIcon,
};

// Mismas clases con que cuentas por pagar resalta una fecha vencida.
const OVERDUE_CLS = "text-red-600 dark:text-red-400 font-semibold";

/** Lo que el historial puede hacer con un seguimiento; los diálogos viven en el contenedor. */
export interface OpportunitySeguimientoActions {
  onCreate: () => void;
  onEdit: (seguimiento: OpportunitySeguimiento) => void;
  onDelete: (seguimiento: OpportunitySeguimiento) => void;
  /** Completa (`true`) o reabre (`false`). */
  onSetCompletado: (seguimiento: OpportunitySeguimiento, completado: boolean) => void;
  /** Ids con un completar/reabrir en curso: su renglón se bloquea. */
  busyIds: number[];
}

interface OpportunitySeguimientosProps {
  opportunity: Opportunity;
  /** Los seguimientos del detalle (`onboarding.seguimientos`: los 50 más recientes). */
  seguimientos: OpportunitySeguimiento[];
  /** Cuenta de pendientes y fecha más próxima, calculadas por el backend. */
  pendientes: number;
  proximoRecordatorio: string | null;
  actions: OpportunitySeguimientoActions;
}

/**
 * Historial de seguimientos de la oportunidad (notas, llamadas, correos,
 * visitas, tareas), que es también su lista de pendientes. Presentacional:
 * recibe los seguimientos del detalle y avisa de cada acción; los diálogos y
 * las mutaciones viven en `OpportunityDetailContent`.
 *
 * - **Orden**: primero lo pendiente, por fecha de recordatorio; después lo
 *   completado, de lo más nuevo a lo más viejo (`groupSeguimientos`).
 * - **Recordatorio** (solo en pendientes): vencido en rojo y con la palabra
 *   "vencido" —no solo el color—; el de hoy, con la etiqueta "Hoy".
 * - **Completar / reabrir**: la casilla, para CUALQUIERA que vea la
 *   oportunidad.
 * - **Editar / eliminar**: solo el autor o un administrador de empresa. Es una
 *   regla de esta pantalla: el backend no la exige. Una sesión que aún no sabe
 *   si es administrador (`unknown`) cuenta como que no.
 * - **Resumen** ("N pendientes · próximo: fecha"): se oculta en una oportunidad
 *   `Perdida`, donde el backend cuenta pendientes que no deberían contar.
 */
export const OpportunitySeguimientos = ({
  opportunity,
  seguimientos,
  pendientes,
  proximoRecordatorio,
  actions,
}: OpportunitySeguimientosProps) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isCompanyAdmin = useCompanyAdminStatus() === "admin";
  const today = getLocalTodayDate();

  const groups = groupSeguimientos(seguimientos);
  const showSummary = opportunity.estado !== ETAPA_PERDIDA;

  const renderItem = (seguimiento: OpportunitySeguimiento) => {
    const Icon = TIPO_ICONS[seguimiento.tipo] ?? CommentIcon;
    const isBusy = actions.busyIds.includes(seguimiento.id);
    const authorLabel = getSeguimientoAuthorLabel(seguimiento, currentUserId);
    const canManage = isCompanyAdmin || isSeguimientoAuthor(seguimiento, currentUserId);
    const recordatorioStatus =
      !seguimiento.completado && seguimiento.fecha_recordatorio
        ? getRecordatorioStatus(seguimiento.fecha_recordatorio, today)
        : null;

    const menuItems: ActionMenuItem[] = [
      { label: "Editar", icon: EditIcon, onSelect: () => actions.onEdit(seguimiento) },
      { label: "Eliminar", icon: DeleteIcon, onSelect: () => actions.onDelete(seguimiento) },
    ];

    return (
      <ActivityTimelineItem
        key={seguimiento.id}
        icon={<Icon className="w-4 h-4" aria-hidden="true" />}
        muted={seguimiento.completado}
        busy={isBusy}
        title={
          <>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seguimiento.completado}
                disabled={isBusy}
                onChange={(event) => actions.onSetCompletado(seguimiento, event.target.checked)}
                aria-label={
                  seguimiento.completado
                    ? `Reabrir: ${seguimiento.tipo} completado`
                    : `Marcar como completado: ${seguimiento.tipo}`
                }
                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
              <span>{seguimiento.tipo}</span>
            </label>
            {recordatorioStatus === "hoy" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Hoy
              </span>
            )}
          </>
        }
        actions={
          canManage ? (
            <ActionMenu items={menuItems} ariaLabel={`Acciones del seguimiento: ${seguimiento.tipo}`} />
          ) : undefined
        }
        meta={
          <>
            {authorLabel && <span>{authorLabel}</span>}
            <span>Creado {formatShortDateTime(seguimiento.created_at)}</span>
            {/* Fecha-calendario sin hora: se lee en UTC para que no se corra un
                día en husos al oeste. */}
            {seguimiento.fecha_recordatorio && (
              <span className={recordatorioStatus === "vencido" ? OVERDUE_CLS : undefined}>
                Recordatorio: {formatShortDate(seguimiento.fecha_recordatorio, { timeZone: "UTC" })}
                {recordatorioStatus === "vencido" && " (vencido)"}
              </span>
            )}
            {seguimiento.completado && seguimiento.completado_at && (
              <span>Completado {formatShortDateTime(seguimiento.completado_at)}</span>
            )}
          </>
        }
      >
        <p className="whitespace-pre-wrap wrap-break-word">{seguimiento.detalle}</p>
      </ActivityTimelineItem>
    );
  };

  const summary =
    pendientes > 0 ? (
      <>
        {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
        {proximoRecordatorio && (
          <>
            {" · próximo: "}
            <span className={proximoRecordatorio < today ? OVERDUE_CLS : undefined}>
              {formatShortDate(proximoRecordatorio, { timeZone: "UTC" })}
            </span>
          </>
        )}
      </>
    ) : (
      "Sin pendientes"
    );

  return (
    <Section
      title="Seguimientos"
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {showSummary && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{summary}</span>
          )}
          <Button
            variant="secondary"
            leftIcon={<PlusIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={actions.onCreate}
          >
            Nuevo seguimiento
          </Button>
        </div>
      }
    >
      {seguimientos.length === 0 ? (
        <EmptyLines>Sin seguimientos registrados.</EmptyLines>
      ) : (
        <div className="space-y-6">
          {groups.pendientes.length > 0 && (
            <div>
              <SectionTitle>Pendientes ({groups.pendientes.length})</SectionTitle>
              <ActivityTimeline ariaLabel="Seguimientos pendientes">
                {groups.pendientes.map(renderItem)}
              </ActivityTimeline>
            </div>
          )}
          {groups.completados.length > 0 && (
            <div>
              <SectionTitle>Completados ({groups.completados.length})</SectionTitle>
              <ActivityTimeline ariaLabel="Seguimientos completados">
                {groups.completados.map(renderItem)}
              </ActivityTimeline>
            </div>
          )}
          {seguimientos.length >= SEGUIMIENTOS_ONBOARDING_LIMIT && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Se muestran los {SEGUIMIENTOS_ONBOARDING_LIMIT} seguimientos más recientes.
            </p>
          )}
        </div>
      )}
    </Section>
  );
};
