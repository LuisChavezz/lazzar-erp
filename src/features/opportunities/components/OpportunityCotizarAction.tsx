"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PedidosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useCreateAndOpenQuote } from "@/src/features/quotes/hooks/useCreateAndOpenQuote";
import { getQuoteOnboardingDataQueryOptions } from "@/src/features/quotes/hooks/useQuoteOnboardingData";
import {
  cotizarOpportunityMutationKey,
  useCotizarOpportunity,
} from "../hooks/useCotizarOpportunity";
import type { Opportunity } from "../interfaces/opportunity.interface";

interface OpportunityCotizarActionProps {
  opportunity: Opportunity;
  /** Cotizaciones que la oportunidad YA tiene: con alguna, la confirmación avisa. */
  cotizacionesCount: number;
}

const CUSTOMER_CHECK_TOAST_ID = "cotizar-customer-check";

/**
 * Botón "Cotizar" con su confirmación. Quien lo monta decide si se muestra
 * (cliente, estado y permisos); el flujo —POST no idempotente con candado y
 * navegación a la cotización nueva en una transición— es el de
 * `useCreateAndOpenQuote`, el mismo de "Recompra".
 *
 * **Antes de confirmar se comprueba que el cliente se pueda cotizar.** La
 * edición de la cotización arma los datos de facturación con el catálogo de
 * clientes del onboarding de cotizaciones (`busqueda.clientes`: los que este
 * usuario puede cotizar); con un cliente que no está ahí abriría en blanco. Se
 * consulta AL HACER CLIC y no al pintar el botón: así el botón no desaparece
 * sin explicación —si el cliente no está, se dice por qué; si la consulta
 * falla, se ofrece reintentar— y el detalle no carga ese catálogo (~370 KB)
 * solo por mostrarse. Usa la MISMA consulta que la edición
 * (`getQuoteOnboardingDataQueryOptions`), que la encuentra ya en caché al
 * llegar.
 */
export function OpportunityCotizarAction({
  opportunity,
  cotizacionesCount,
}: OpportunityCotizarActionProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: cotizar } = useCotizarOpportunity(opportunity.id);
  const {
    isCreating: isCotizando,
    openConfirm,
    triggerProps,
    confirmDialogProps,
  } = useCreateAndOpenQuote({
    mutationKey: cotizarOpportunityMutationKey(opportunity.id),
    create: async () =>
      (await cotizar({ id: opportunity.id, cliente: opportunity.cliente })).cotizacion_id,
  });

  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

  const checkCustomerAndOpen = async () => {
    setIsCheckingCustomer(true);
    try {
      const onboarding = await queryClient.fetchQuery(getQuoteOnboardingDataQueryOptions());
      const isQuotable = onboarding.busqueda.clientes.some(
        (customer) => String(customer.id) === String(opportunity.cliente)
      );
      if (!isQuotable) {
        toast.error(
          `No puedes cotizar a ${
            opportunity.cliente_nombre ?? "este cliente"
          }: no está entre tus clientes activos para cotizar. Revisa que esté activo y asignado a ti.`,
          { id: CUSTOMER_CHECK_TOAST_ID, duration: 8000 }
        );
        return;
      }
      toast.dismiss(CUSTOMER_CHECK_TOAST_ID);
      openConfirm();
    } catch (error) {
      console.error(error);
      toast.error(
        (currentToast) => (
          <span className="flex items-center gap-3">
            No se pudo comprobar el cliente de la oportunidad.
            <button
              type="button"
              onClick={() => {
                toast.dismiss(currentToast.id);
                void checkCustomerAndOpen();
              }}
              className="font-semibold underline cursor-pointer whitespace-nowrap"
            >
              Reintentar
            </button>
          </span>
        ),
        { id: CUSTOMER_CHECK_TOAST_ID, duration: 10000 }
      );
    } finally {
      setIsCheckingCustomer(false);
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
        onClick={checkCustomerAndOpen}
        disabled={triggerProps.disabled || isCheckingCustomer}
        leftIcon={<PedidosIcon className="w-4 h-4" aria-hidden="true" />}
      >
        {isCheckingCustomer ? "Comprobando..." : "Cotizar"}
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
