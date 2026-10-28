"use client";

import { InfoField, InfoGrid, Section } from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { plural } from "@/src/utils/kpiFormat";
import type { Customer } from "../interfaces/customer.interface";

/**
 * Condiciones de crédito del cliente. Los dos campos vienen también en el
 * listado, así que se pintan desde la fila mientras llega el detalle.
 *
 * `limite_credito` no tiene moneda: va sin símbolo y NO se opera contra la
 * antigüedad de saldos (que sí va por moneda); solo se muestran lado a lado.
 */
export const CustomerCredito = ({
  customer,
}: {
  customer: Pick<Customer, "dias_credito" | "limite_credito">;
}) => (
  <Section title="Crédito">
    <InfoGrid>
      <InfoField label="Días de crédito">
        <span className="tabular-nums">
          {customer.dias_credito} {plural(customer.dias_credito, "día", "días")}
        </span>
      </InfoField>
      <InfoField label="Límite de crédito (informativo, sin moneda)">
        <span className="tabular-nums">
          {formatMoneyValue(customer.limite_credito, null)}
        </span>
      </InfoField>
    </InfoGrid>
  </Section>
);
