"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { EmptyLines, LineItemsTable, Section } from "@/src/components/DetailDialogPrimitives";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { OPPORTUNITY_ORIGIN_ID_PARAM } from "@/src/features/orders/constants/pedidoDetailOrigins";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
import {
  canLandOnQuoteEdit,
  quoteEditPath,
} from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { canEditQuote } from "@/src/features/quotes/utils/quoteStatusRules";
import { formatShortDate } from "@/src/utils/formatDate";
import { canAccessRoute } from "@/src/utils/routeAccess";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";

const TH_CLASS = "px-3 py-2 font-medium whitespace-nowrap";
const TD_CLASS = "px-3 py-2 whitespace-nowrap";
const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/** Mismos colores por estatus que el tablero de cotizaciones. */
const BADGE_BY_ESTATUS = new Map(KANBAN_COLUMNS.map((column) => [column.estatus, column]));
const FALLBACK_BADGE = "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300";

interface OpportunityCotizacionesProps {
  opportunityId: number;
  cotizaciones: OpportunityCotizacion[];
}

/**
 * Cotizaciones ligadas a la oportunidad, cada una con el pedido que nació de
 * ella. Presentacional: recibe el arreglo del detalle (`onboarding`).
 *
 * - **Cotización**: enlaza a su edición SOLO si su estatus la permite (Borrador
 *   o Autorizada, `canEditQuote`) y el usuario puede entrar a esa ruta; el resto
 *   va como texto, porque la ruta de edición las rebotaría al listado. Aun con
 *   enlace, el backend puede negarla (la creó otra persona): esa ruta avisa por
 *   toast antes de redirigir.
 * - **Pedido**: los pedidos se ven por empresa, sin importar el vendedor, así
 *   que se enlaza siempre que el usuario pueda abrir `/orders`. El origen
 *   `opportunities` lleva el id para que "Volver" regrese a ESTA oportunidad.
 * - **Fechas**: timestamps reales (llegan en UTC), en la zona del usuario.
 */
export const OpportunityCotizaciones = ({
  opportunityId,
  cotizaciones,
}: OpportunityCotizacionesProps) => {
  const { data: session } = useSession();
  const canOpenQuoteEdit = canLandOnQuoteEdit(session?.user);

  return (
    <Section title={`Cotizaciones (${cotizaciones.length})`}>
      {cotizaciones.length === 0 ? (
        <EmptyLines>Esta oportunidad aún no tiene cotizaciones.</EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className={TH_CLASS}>Cotización</th>
              <th className={TH_CLASS}>Estatus</th>
              <th className={TH_CLASS}>Creada</th>
              <th className={TH_CLASS}>Autorizada</th>
              <th className={TH_CLASS}>Pedido</th>
            </>
          }
        >
          {cotizaciones.map((cotizacion) => {
            const badge = BADGE_BY_ESTATUS.get(cotizacion.estatus);
            const estatusLabel = cotizacion.estatus_display || badge?.label || "Sin estatus";
            const isEditable = canEditQuote(cotizacion.estatus);
            const pedidoId = cotizacion.pedido_id;

            let pedido = <span className={MUTED_CLS}>—</span>;
            if (pedidoId !== null && canAccessRoute(`/orders/${pedidoId}`, session?.user)) {
              pedido = (
                <PedidoFolioLink
                  pedidoId={pedidoId}
                  folio={cotizacion.pedido_folio}
                  from="opportunities"
                  query={{ [OPPORTUNITY_ORIGIN_ID_PARAM]: String(opportunityId) }}
                  className="font-semibold text-sky-600 dark:text-sky-400"
                />
              );
            } else if (pedidoId !== null) {
              pedido = (
                <span className="font-semibold">{cotizacion.pedido_folio || `#${pedidoId}`}</span>
              );
            }

            return (
              <tr key={cotizacion.id} className="text-slate-700 dark:text-slate-200">
                <td className={`${TD_CLASS} font-semibold tabular-nums`}>
                  {isEditable && canOpenQuoteEdit ? (
                    <Link
                      href={quoteEditPath(cotizacion.id)}
                      title="Editar cotización"
                      className="text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                    >
                      #{cotizacion.id}
                    </Link>
                  ) : (
                    <span
                      title={
                        isEditable
                          ? undefined
                          : "En su estatus actual esta cotización no se puede editar"
                      }
                    >
                      #{cotizacion.id}
                    </span>
                  )}
                </td>
                <td className={TD_CLASS}>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      badge?.badgeClass ?? FALLBACK_BADGE
                    }`}
                  >
                    {estatusLabel}
                  </span>
                </td>
                <td className={TD_CLASS}>{formatShortDate(cotizacion.created_at)}</td>
                <td className={TD_CLASS}>{formatShortDate(cotizacion.autorizada_at)}</td>
                <td className={TD_CLASS}>{pedido}</td>
              </tr>
            );
          })}
        </LineItemsTable>
      )}
    </Section>
  );
};
