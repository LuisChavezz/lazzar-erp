import type { PickingOnboardingProgramacion } from "../interfaces/picking-onboarding.interface";
import { getProgramacionDestinoLabel } from "../utils/pickingDestino";

interface PickingProgramacionesHintProps {
  programaciones: readonly PickingOnboardingProgramacion[];
}

/**
 * Pista bajo "Almacén destino": hacia dónde programó Mesa de Control cada
 * parcialidad del pedido, p. ej. "Programado: Apartado · 4 pzs → APARTADOS".
 * Sin almacén sugerido (destino sin almacén propio, o un listado que todavía
 * no lo trae) se omite la flecha. Es solo informativa: el destino lo sigue
 * eligiendo el usuario en el selector.
 */
export function PickingProgramacionesHint({ programaciones }: PickingProgramacionesHintProps) {
  if (programaciones.length === 0) return null;

  return (
    <ul aria-label="Programación del pedido" className="mt-1.5 ml-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      {programaciones.map((programacion, index) => {
        // `?.`: el listado de un backend anterior a EC-645 no trae la clave.
        const almacenNombre = programacion.almacen_sugerido?.nombre;
        const comentarios = programacion.comentarios?.trim();
        return (
          // Sin id propio: el orden lo fija Mesa de Control y la lista solo se lee.
          <li key={index}>
            Programado: {getProgramacionDestinoLabel(programacion.destino)} ·{" "}
            <span className="tabular-nums">{programacion.cantidad}</span> pzs
            {almacenNombre ? (
              <>
                {" "}→ <span className="font-medium text-slate-600 dark:text-slate-300">{almacenNombre}</span>
              </>
            ) : null}
            {comentarios ? (
              <span className="italic" title={comentarios}>
                {" "}— {comentarios}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
