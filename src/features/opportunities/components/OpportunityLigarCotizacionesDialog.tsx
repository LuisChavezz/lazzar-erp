"use client";

import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { MultiSelectPickerDialogContent } from "@/src/components/MultiSelectPickerDialogContent";
import { formatMoneyValue, moneyFormatFor } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { OPPORTUNITY_GONE_DETAIL_MESSAGE } from "../hooks/opportunityErrorMessages";
import {
  isLigarOportunidadRejection,
  ligarCotizacionesMutationKey,
  useLigarOpportunityCotizaciones,
  useOpportunityCotizacionesLinks,
} from "../hooks/useOpportunityCotizacionLinks";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { cotizacionEstatusBadge } from "../utils/cotizacionEstatus";
import { CotizacionEstatusBadge } from "./CotizacionEstatusBadge";

interface OpportunityLigarCotizacionesDialogProps {
  /** Oportunidad a la que se ligan; `null` = cerrado. */
  opportunityId: number | null;
  onClose: () => void;
}

/**
 * Contenido del selector, montado solo con el diálogo abierto: la consulta corre
 * bajo demanda y la selección arranca vacía en cada apertura.
 *
 * Ofrece las `disponibles` tal cual: el backend ya excluye las autorizadas (y
 * rechaza ligarlas). Las rechazadas sí se ofrecen.
 *
 * Queda abierto mientras se guarda y se cierra con éxito o cuando el rechazo es
 * de la OPORTUNIDAD (`etapa`, `cliente`). Con un rechazo de las cotizaciones
 * (todo o nada) la selección sigue ahí y la relectura actualiza la lista.
 */
function LigarCotizacionesContent({
  opportunityId,
  onClose,
}: {
  opportunityId: number;
  onClose: () => void;
}) {
  const { disponibles, isLoading, isInitialError, isNotFound } =
    useOpportunityCotizacionesLinks(opportunityId);
  const { mutate: ligar, isPending } = useLigarOpportunityCotizaciones(opportunityId);

  return (
    <MultiSelectPickerDialogContent<OpportunityCotizacion>
      title="Ligar cotizaciones"
      subtitle="Cotizaciones del cliente que no están en ninguna oportunidad (las 100 más recientes), sin las autorizadas."
      items={disponibles}
      isLoading={isLoading}
      isError={isInitialError || isNotFound}
      loadingTitle="Cargando cotizaciones"
      loadingMessage="Obteniendo las cotizaciones del cliente..."
      errorMessage={
        isNotFound ? OPPORTUNITY_GONE_DETAIL_MESSAGE : "Error al cargar las cotizaciones disponibles."
      }
      searchPlaceholder="Buscar por número o estatus..."
      filterPredicate={(cotizacion, term) =>
        `#${cotizacion.id}`.includes(term) ||
        cotizacionEstatusBadge(cotizacion).label.toLowerCase().includes(term)
      }
      getKey={(cotizacion) => cotizacion.id}
      emptyMessage="Este cliente no tiene cotizaciones que se puedan ligar a la oportunidad."
      noResultsMessage="No se encontraron cotizaciones"
      countLabel={{ singular: "cotización seleccionada", plural: "cotizaciones seleccionadas" }}
      pinSelected
      isConfirming={isPending}
      confirmingText="Ligando…"
      renderContent={(cotizacion) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              Cotización #{cotizacion.id}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CotizacionEstatusBadge cotizacion={cotizacion} />
              <span>Creada {formatShortDate(cotizacion.created_at)}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Total</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatMoneyValue(cotizacion.gran_total, moneyFormatFor(cotizacion.moneda))}
            </p>
          </div>
        </div>
      )}
      onConfirm={(cotizaciones) =>
        ligar(
          cotizaciones.map((cotizacion) => cotizacion.id),
          {
            onSuccess: onClose,
            // La oportunidad ya no admite ligar (cerrada, sin cliente): el
            // detalle ya se releyó y oculta el botón; seguir aquí solo
            // permitiría repetir el mismo 400.
            onError: (error) => {
              if (isLigarOportunidadRejection(error)) onClose();
            },
          }
        )
      }
      onCancel={onClose}
    />
  );
}

/**
 * "Ligar cotización": selector MÚLTIPLE de cotizaciones ya hechas del cliente
 * de la oportunidad. No se puede cerrar mientras guarda.
 */
export function OpportunityLigarCotizacionesDialog({
  opportunityId,
  onClose,
}: OpportunityLigarCotizacionesDialogProps) {
  const open = opportunityId !== null;
  // Fuera del contenido, que es quien muta: Escape o un clic fuera no cierran
  // mientras el POST sigue en curso.
  const isLigando =
    useIsMutating({ mutationKey: ligarCotizacionesMutationKey(opportunityId ?? 0) }) > 0;

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isLigando) onClose();
      }}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {open && <LigarCotizacionesContent opportunityId={opportunityId} onClose={onClose} />}
    </MainDialog>
  );
}
