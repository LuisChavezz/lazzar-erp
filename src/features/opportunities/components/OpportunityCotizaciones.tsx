"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/src/components/Button";
import { EmptyLines, LineItemsTable, Section } from "@/src/components/DetailDialogPrimitives";
import { PlusIcon } from "@/src/components/Icons";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { OPPORTUNITY_ORIGIN_ID_PARAM } from "@/src/features/orders/constants/pedidoDetailOrigins";
import {
  canLandOnQuoteEdit,
  quoteEditPath,
} from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { canEditQuote } from "@/src/features/quotes/utils/quoteStatusRules";
import { formatMoneyValue, moneyFormatFor } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { OPPORTUNITY_LIST_PARAM } from "../constants/opportunityRoutes";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { isCotizacionAutorizada } from "../utils/cotizacionEstatus";
import { CotizacionEstatusBadge } from "./CotizacionEstatusBadge";

const TH_CLASS = "px-3 py-2 font-medium whitespace-nowrap";
const TD_CLASS = "px-3 py-2 whitespace-nowrap";
const MUTED_CLS = "text-slate-400 dark:text-slate-500";

interface OpportunityCotizacionesProps {
  opportunityId: number;
  cotizaciones: OpportunityCotizacion[];
  /**
   * Estado validado del listado del que se llegó al detalle (`""` si no hay):
   * se reenvía al pedido para que su "Volver" regrese a este detalle con él.
   */
  listQuery: string;
  /**
   * `false` oculta "Ligar cotización": la oportunidad está Perdida o no tiene
   * cliente (el backend respondería 400 en `etapa` / `cliente`).
   */
  canLigar: boolean;
  /** Abre el selector de "Ligar cotización" (su estado vive en el detalle). */
  onLigar: () => void;
  /** Abre la confirmación de "Quitar" para esa cotización. */
  onQuitar: (cotizacion: OpportunityCotizacion) => void;
  /** Ids con un "Quitar" en curso: su renglón queda bloqueado. */
  busyIds: number[];
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
 * - **Estatus**: con el nombre que la app usa en Cotizaciones y Mesa de Control
 *   ("Por Autorizar"), no el del backend ("EN REVISION"), que solo queda de
 *   respaldo para un estatus que el tablero no conozca.
 * - **Pedido**: los pedidos se ven por empresa, sin importar el vendedor, así
 *   que se enlaza siempre que el usuario pueda abrir `/orders`. El origen
 *   `opportunities` lleva el id para que "Volver" regrese a ESTA oportunidad, y
 *   el estado del listado para que desde aquí se siga pudiendo volver a él.
 * - **Fechas**: timestamps reales (llegan en UTC), en la zona del usuario.
 * - **Total**: `gran_total` en la `moneda` de la cotización; sin moneda, sin
 *   símbolo.
 * - **Quitar**: no en una autorizada (el backend responde 400: la oportunidad
 *   dejaría de estar Ganada). Las acciones solo abren diálogos; su estado vive
 *   en el detalle, no en el renglón, que se remonta con cada relectura.
 */
export const OpportunityCotizaciones = ({
  opportunityId,
  cotizaciones,
  listQuery,
  canLigar,
  onLigar,
  onQuitar,
  busyIds,
}: OpportunityCotizacionesProps) => {
  const { data: session } = useSession();
  const canOpenQuoteEdit = canLandOnQuoteEdit(session?.user);
  // La regla de `/orders` no depende del id: se resuelve una vez.
  const canOpenPedido = canAccessRoute("/orders", session?.user);

  return (
    <Section
      title={`Cotizaciones (${cotizaciones.length})`}
      action={
        canLigar && (
          <Button
            variant="secondary"
            leftIcon={<PlusIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={onLigar}
          >
            Ligar cotización
          </Button>
        )
      }
    >
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
              <th className={`${TH_CLASS} text-right`}>Total</th>
              <th className={`${TH_CLASS} text-center`}>Acciones</th>
            </>
          }
        >
          {cotizaciones.map((cotizacion) => {
            const isEditable = canEditQuote(cotizacion.estatus);
            const isBusy = busyIds.includes(cotizacion.id);
            const pedidoId = cotizacion.pedido_id;

            let pedido = <span className={MUTED_CLS}>—</span>;
            if (pedidoId !== null && canOpenPedido) {
              pedido = (
                <PedidoFolioLink
                  pedidoId={pedidoId}
                  folio={cotizacion.pedido_folio}
                  from="opportunities"
                  query={{
                    [OPPORTUNITY_ORIGIN_ID_PARAM]: String(opportunityId),
                    ...(listQuery ? { [OPPORTUNITY_LIST_PARAM]: listQuery } : {}),
                  }}
                  className="font-semibold text-sky-600 dark:text-sky-400"
                />
              );
            } else if (pedidoId !== null) {
              pedido = (
                <span className="font-semibold">{cotizacion.pedido_folio || `#${pedidoId}`}</span>
              );
            }

            return (
              <tr
                key={cotizacion.id}
                aria-busy={isBusy || undefined}
                className={`text-slate-700 dark:text-slate-200 ${isBusy ? "opacity-50" : ""}`}
              >
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
                  <CotizacionEstatusBadge cotizacion={cotizacion} />
                </td>
                <td className={TD_CLASS}>{formatShortDate(cotizacion.created_at)}</td>
                <td className={TD_CLASS}>{formatShortDate(cotizacion.autorizada_at)}</td>
                <td className={TD_CLASS}>{pedido}</td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>
                  {formatMoneyValue(cotizacion.gran_total, moneyFormatFor(cotizacion.moneda))}
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  {isCotizacionAutorizada(cotizacion) ? (
                    <span
                      className={MUTED_CLS}
                      title="Una cotización autorizada no se quita de la oportunidad"
                    >
                      —
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onQuitar(cotizacion)}
                      disabled={isBusy}
                      aria-label={`Quitar la cotización #${cotizacion.id} de la oportunidad`}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline disabled:cursor-not-allowed disabled:no-underline"
                    >
                      {isBusy ? "Quitando…" : "Quitar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </LineItemsTable>
      )}
    </Section>
  );
};
