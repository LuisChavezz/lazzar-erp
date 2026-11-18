"use client";

import { useOpParaSalidaMaquila } from "../hooks/useOpParaSalidaMaquila";
import { opSeed } from "../utils/salidaMaquilaDraft";
import { GenerarSalidaMaquilaDialog } from "./GenerarSalidaMaquilaDialog";
import { SalidasMaquilaSection, type GenerarSalidaMaquilaSlotProps } from "./SalidasMaquilaSection";

/**
 * Alta de SM desde la OP: pide el retrieve de la OP al abrirse (el detalle de
 * la página no trae los ids de renglón ni el costo de maquila).
 */
function OpGenerarSalidaMaquilaDialog({ opId, ...props }: GenerarSalidaMaquilaSlotProps & { opId: number }) {
  const { data, isLoading, isInitialError } = useOpParaSalidaMaquila(opId, props.open);
  return (
    <GenerarSalidaMaquilaDialog
      origen="OP"
      seed={data ? opSeed(data) : undefined}
      isLoading={isLoading}
      isError={isInitialError}
      {...props}
    />
  );
}

/** Salidas a maquila de una OP, en su detalle. */
export function OpSalidasMaquilaSection({ opId, opCancelada }: { opId: number; opCancelada: boolean }) {
  return (
    <SalidasMaquilaSection
      origen="OP"
      ordenId={opId}
      cancelada={opCancelada}
      renderGenerarDialog={(props) => <OpGenerarSalidaMaquilaDialog opId={opId} {...props} />}
    />
  );
}
