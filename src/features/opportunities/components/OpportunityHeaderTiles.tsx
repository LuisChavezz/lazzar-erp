import { InfoTile, InfoTileGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type { Opportunity } from "../interfaces/opportunity.interface";
import {
  getOpportunityClienteContacto,
  getOpportunityClienteLabel,
} from "../utils/opportunityClienteLabel";

const MUTED_CLS = "text-slate-400 dark:text-slate-500";

/**
 * Mosaicos del encabezado del detalle de una oportunidad (mismo molde que el
 * detalle del cliente, `CustomerHeaderTiles`): lo que identifica y resume la
 * oportunidad. El resto de los datos sigue en la sección "Datos de la
 * oportunidad".
 *
 * El cliente se nombra con la convención de EC-810 (razón social) y, debajo,
 * su persona de contacto rotulada cuando aporta algo; aquí hay espacio para
 * ella, en el listado no. La etapa es INFORMATIVA (lo que se capturó); el
 * estatus es el `estado` calculado, que va como badge junto al título.
 */
export function OpportunityHeaderTiles({ opportunity }: { opportunity: Opportunity }) {
  const clienteLabel = getOpportunityClienteLabel(opportunity);
  const clienteContacto = getOpportunityClienteContacto(opportunity);
  const vendedor = opportunity.vendedor_nombre?.trim();

  return (
    <InfoTileGrid>
      <InfoTile label="Cliente">
        {clienteLabel ? (
          <>
            <span className="block truncate" title={clienteLabel}>
              {clienteLabel}
            </span>
            {clienteContacto && (
              <span
                className="block truncate text-xs font-normal text-slate-500 dark:text-slate-400"
                title={`Contacto: ${clienteContacto}`}
              >
                Contacto: {clienteContacto}
              </span>
            )}
          </>
        ) : (
          <span className={MUTED_CLS}>Sin cliente</span>
        )}
      </InfoTile>
      <InfoTile label="Vendedor">
        {vendedor || <span className={MUTED_CLS}>Sin asignar</span>}
      </InfoTile>
      {/* Sin símbolo de moneda: las oportunidades no tienen moneda. */}
      <InfoTile label="Monto estimado">
        <span className="tabular-nums">
          {formatCurrency(safeParseAmount(opportunity.monto_estimado), null)}
        </span>
      </InfoTile>
      <InfoTile label="Etapa">{textOrDash(opportunity.etapa)}</InfoTile>
      {/* Fecha-calendario sin hora: se lee en UTC para que no se corra un día
          en husos al oeste. "Creada" es un timestamp real. */}
      <InfoTile label="Próximo contacto">
        <span className="tabular-nums">
          {formatShortDate(opportunity.proximo_contacto, { timeZone: "UTC" })}
        </span>
      </InfoTile>
      <InfoTile label="Creada">{formatShortDate(opportunity.created_at)}</InfoTile>
    </InfoTileGrid>
  );
}
