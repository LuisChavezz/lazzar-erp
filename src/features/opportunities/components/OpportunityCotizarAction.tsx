"use client";

import { PedidosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useCreateAndOpenQuote } from "@/src/features/quotes/hooks/useCreateAndOpenQuote";
import { useCotizarOpportunity } from "../hooks/useCotizarOpportunity";
import type { Opportunity } from "../interfaces/opportunity.interface";

interface OpportunityCotizarActionProps {
  opportunity: Opportunity;
  /** Cotizaciones que la oportunidad YA tiene: con alguna, la confirmación avisa. */
  cotizacionesCount: number;
}

/**
 * Botón "Cotizar" con su confirmación. Quien lo monta decide si se muestra
 * (cliente, estado y permisos); el flujo —POST no idempotente con candado
 * síncrono y navegación a la cotización nueva en una transición— es el de
 * `useCreateAndOpenQuote`, el mismo de "Recompra".
 */
export function OpportunityCotizarAction({
  opportunity,
  cotizacionesCount,
}: OpportunityCotizarActionProps) {
  const { mutateAsync: cotizar, isPending: isCotizando } = useCotizarOpportunity();
  const { triggerProps, confirmDialogProps } = useCreateAndOpenQuote({
    create: async () =>
      (await cotizar({ id: opportunity.id, cliente: opportunity.cliente })).cotizacion_id,
    isCreating: isCotizando,
  });

  const hasCotizaciones = cotizacionesCount > 0;
  const paraQuien = opportunity.cliente_nombre ? ` para ${opportunity.cliente_nombre}` : "";
  const queSeCrea = `Se creará una cotización NUEVA en borrador${paraQuien}, ligada a esta oportunidad; podrás capturar sus productos antes de enviarla a revisión.`;
  const yaTiene = `Esta oportunidad ya tiene ${cotizacionesCount} ${
    cotizacionesCount === 1 ? "cotización" : "cotizaciones"
  }; ¿crear otra?`;
  const idleConfirmText = hasCotizaciones ? "Crear otra" : "Crear cotización";

  return (
    <>
      <Button
        variant="primary"
        {...triggerProps}
        leftIcon={<PedidosIcon className="w-4 h-4" aria-hidden="true" />}
      >
        Cotizar
      </Button>
      <ConfirmDialog
        {...confirmDialogProps}
        title={hasCotizaciones ? "Crear otra cotización" : "Crear cotización"}
        description={hasCotizaciones ? `${yaTiene} ${queSeCrea}` : queSeCrea}
        confirmText={isCotizando ? "Creando..." : idleConfirmText}
        confirmColor="blue"
      />
    </>
  );
}
