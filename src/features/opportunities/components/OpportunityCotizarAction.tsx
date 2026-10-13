"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PedidosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { quoteEditPath } from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { useCotizarOpportunity } from "../hooks/useCotizarOpportunity";
import type { Opportunity } from "../interfaces/opportunity.interface";

interface OpportunityCotizarActionProps {
  opportunity: Opportunity;
  /** Cotizaciones que la oportunidad YA tiene: con alguna, la confirmación avisa. */
  cotizacionesCount: number;
}

/**
 * Botón "Cotizar" con su confirmación. Quien lo monta decide si se muestra
 * (cliente, estado y permisos); aquí solo vive el flujo, el mismo de
 * `OrderRecompraAction`: POST no idempotente con candado síncrono y navegación
 * a la cotización nueva en una transición.
 */
export function OpportunityCotizarAction({
  opportunity,
  cotizacionesCount,
}: OpportunityCotizarActionProps) {
  const router = useRouter();
  const { mutateAsync: cotizar, isPending: isCotizando } = useCotizarOpportunity();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // El endpoint NO es idempotente. `isPending` llega un render tarde, así que
  // un doble clic rápido lo rebasaría: el candado síncrono es el ref, y solo
  // cubre el POST (lo único no idempotente).
  const lockRef = useRef(false);
  // La navegación va en una transición: `isPending` sigue en `true` hasta que
  // la ruta nueva se monta y vuelve a `false` sola si se abandona.
  const [isNavigatingToQuote, startNavigationToQuote] = useTransition();

  const handleConfirm = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      const { cotizacion_id } = await cotizar({
        id: opportunity.id,
        cliente: opportunity.cliente,
      });
      setIsConfirmOpen(false);
      startNavigationToQuote(() => {
        router.push(quoteEditPath(cotizacion_id));
      });
    } catch {
      // El hook ya avisó con su toast; el diálogo queda abierto y cerrable
      // para reintentar o cancelar.
    } finally {
      lockRef.current = false;
    }
  };

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
        onClick={() => setIsConfirmOpen(true)}
        disabled={isCotizando || isNavigatingToQuote}
        leftIcon={<PedidosIcon className="w-4 h-4" aria-hidden="true" />}
      >
        Cotizar
      </Button>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={hasCotizaciones ? "Crear otra cotización" : "Crear cotización"}
        description={hasCotizaciones ? `${yaTiene} ${queSeCrea}` : queSeCrea}
        confirmText={isCotizando ? "Creando..." : idleConfirmText}
        confirmColor="blue"
        closeOnConfirm={false}
        busy={isCotizando}
        onConfirm={handleConfirm}
      />
    </>
  );
}
