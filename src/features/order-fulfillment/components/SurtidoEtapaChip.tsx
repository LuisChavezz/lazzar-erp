import { getSurtidoEtapaConfig } from "../constants/surtidoEtapa";

/** Chip de la etapa de surtido (pedido o talla), con el texto del mapa de constantes. */
export function SurtidoEtapaChip({ etapa }: { etapa: string }) {
  const config = getSurtidoEtapaConfig(etapa);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-none whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}
