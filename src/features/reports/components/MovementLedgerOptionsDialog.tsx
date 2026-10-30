"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import {
  MOVEMENT_LEDGER_MAX_OPTIONS,
  type MovementLedgerVariant,
} from "@/src/features/stock/interfaces/movement-ledger.interface";

interface MovementLedgerOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Texto buscado, para el subtítulo. */
  query: string;
  /** Coincidencias que regresó el backend (2 a `MOVEMENT_LEDGER_MAX_OPTIONS`). */
  options: MovementLedgerVariant[];
  onConfirm: (option: MovementLedgerVariant) => void;
}

const matches = (value: string | null, term: string) =>
  (value ?? "").toLowerCase().includes(term);

/**
 * Selector de la variante cuando la búsqueda tuvo varias coincidencias. Lista
 * lo que ya trajo la respuesta (no consulta nada); el buscador de adentro solo
 * acota esa lista. Al confirmar, el contenedor pide el kardex por
 * `producto_variante`.
 */
export function MovementLedgerOptionsDialog({
  open,
  onOpenChange,
  query,
  options,
  onConfirm,
}: MovementLedgerOptionsDialogProps) {
  // El backend corta en `MOVEMENT_LEDGER_MAX_OPTIONS` sin decir si hay más.
  const mayBeTruncated = options.length >= MOVEMENT_LEDGER_MAX_OPTIONS;
  const subtitle = mayBeTruncated
    ? `Se muestran las primeras ${MOVEMENT_LEDGER_MAX_OPTIONS} coincidencias de "${query}"; puede haber más. Si no ves la que buscas, refina la búsqueda.`
    : `${options.length} coincidencias de "${query}". Elige una para ver su auxiliar.`;

  return (
    <MainDialog open={open} onOpenChange={onOpenChange} title="" maxWidth="640px" showCloseButton={false}>
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && (
        <SingleSelectPickerDialogContent<MovementLedgerVariant>
          title="Elegir variante"
          subtitle={subtitle}
          items={options}
          searchPlaceholder="Filtrar por SKU, descripción, color o talla..."
          filterPredicate={(option, term) =>
            matches(option.sku, term) ||
            matches(option.sku_produccion, term) ||
            matches(option.descripcion, term) ||
            matches(option.color, term) ||
            matches(option.talla, term)
          }
          getKey={(option) => option.producto_variante_id}
          selectedKey={null}
          pinSelected
          emptyMessage="Sin resultados."
          noResultsMessage="Ninguna coincidencia contiene ese texto"
          renderContent={(option) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {option.sku}
                  {option.sku_produccion && (
                    <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {option.sku_produccion}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {option.descripcion || "Sin descripción"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {[option.color, option.talla].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {!option.activo && (
                <div className="shrink-0">
                  <StatusBadge status="inactivo" config={ACTIVO_INACTIVO_CFG} />
                </div>
              )}
            </div>
          )}
          onConfirm={(option) => {
            onConfirm(option);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
