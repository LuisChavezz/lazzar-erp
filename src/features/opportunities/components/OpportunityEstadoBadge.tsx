import { StatusBadge } from "@/src/components/StatusBadge";
import { ESTADO_OPORTUNIDAD_CFG } from "../constants/opportunityChoices";

/**
 * Badge del `estado` (el estatus calculado por el backend) de una oportunidad.
 * Un valor que el catálogo no conozca cae al gris neutro de `StatusBadge` con
 * su texto crudo, y uno vacío se rotula "Sin estado".
 */
export function OpportunityEstadoBadge({ estado }: { estado: string | null | undefined }) {
  return (
    <StatusBadge
      status={estado ?? ""}
      config={ESTADO_OPORTUNIDAD_CFG}
      defaultConfig={estado ? undefined : { label: "Sin estado" }}
    />
  );
}
