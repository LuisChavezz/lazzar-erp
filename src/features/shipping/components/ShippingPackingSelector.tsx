"use client";

import { Loader } from "@/src/components/Loader";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { useShippingOnboarding } from "../hooks/useShippingOnboarding";
import type { ShipmentOnboardingPacking } from "../interfaces/shipping-onboarding.interface";

interface ShippingPackingSelectorProps {
  selectedPackingId: number | null;
  onSelect: (packingId: number) => void;
  /** Bloquea la selección mientras el registro está en vuelo. */
  disabled?: boolean;
}

/**
 * Tope de resultados que devuelve `GET /wms/despachos/onboarding/` (`[:50]` en
 * el servicio del backend, sin paginación ni filtro por texto).
 */
const PACKING_CATALOG_LIMIT = 50;

/**
 * Selector del packing a despachar. El catálogo puede traer hasta 50 packings
 * sin paginar ni filtrar por texto (mismo tope que el onboarding de packing),
 * así que se navega con un buscador en memoria (`SearchableSelectList`) en vez
 * de un `FormSelect` plano — mismo patrón que `PackingWizardStep1`, heredado a
 * su vez de `ProductionOrderStep1`.
 *
 * Usa el onboarding SIN alcance (solo el catálogo), que sí se cachea con el
 * `staleTime` global del proyecto; la llamada con alcance al packing elegido
 * —la que casi no se cachea— vive en `useShippingForm`.
 */
export function ShippingPackingSelector({
  selectedPackingId,
  onSelect,
  disabled = false,
}: ShippingPackingSelectorProps) {
  const { data, isLoading, isError } = useShippingOnboarding();
  const packings = data?.packings ?? [];

  if (isLoading) {
    return (
      <Loader
        className="py-10"
        title="Cargando packings"
        message="Obteniendo packings disponibles para enviar..."
      />
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudo cargar el catálogo de packings
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  // El backend corta el catálogo en 50 sin paginar ni aceptar un filtro de
  // texto, y la búsqueda de aquí abajo filtra SOLO lo ya cargado. Sin este
  // aviso, un packing fuera de la ventana se lee como "no existe" cuando en
  // realidad nunca llegó al cliente.
  const isCatalogCapped = packings.length >= PACKING_CATALOG_LIMIT;

  return (
    // `fieldset disabled` (no `pointer-events-none`): además del mouse hay que
    // sacar del tab order el buscador y los botones de cada packing. Con solo
    // `pointer-events-none` se puede tabular y pulsar Enter durante el POST,
    // cambiando de packing con el registro anterior en vuelo — el error de
    // datos obsoletos que llegara después refetchearía y se explicaría sobre
    // líneas que ya no están en pantalla. Mismo tratamiento que la tabla de
    // líneas en `ShippingCreateForm`.
    <fieldset disabled={disabled} className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      {isCatalogCapped && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
          Mostrando los {PACKING_CATALOG_LIMIT} packings más recientes. La búsqueda solo filtra
          esta lista: si no encuentras uno más antiguo, puede estar fuera de ella.
        </p>
      )}

      <SearchableSelectList<ShipmentOnboardingPacking>
        items={packings}
        searchPlaceholder="Buscar packing por folio, pedido, cliente o almacén..."
        filterPredicate={(packing, term) =>
          packing.folio.toLowerCase().includes(term) ||
          (packing.pedido_folio ?? "").toLowerCase().includes(term) ||
          (packing.cliente_nombre ?? "").toLowerCase().includes(term) ||
          (packing.almacen_nombre ?? "").toLowerCase().includes(term) ||
          (packing.picking_folio ?? "").toLowerCase().includes(term)
        }
        getKey={(packing) => packing.id}
        isSelected={(packing) => packing.id === selectedPackingId}
        // Selección única SIN alternancia: a diferencia del Paso 1 de packing,
        // aquí deseleccionar no lleva a ningún lado (no hay botón "Continuar"
        // que deshabilitar) y solo vaciaría la tabla de líneas ya cargada.
        onSelect={(packing) => onSelect(packing.id)}
        emptyMessage="No hay packings disponibles para enviar."
        noResultsMessage="No se encontraron packings"
        renderIndicator={renderRadioIndicator}
        renderContent={(packing) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {packing.folio}
              </p>
              {packing.pedido_folio && (
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                  {packing.pedido_folio}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {packing.cliente_nombre ?? "—"} · {packing.almacen_nombre ?? "—"}
            </p>
          </>
        )}
      />
    </fieldset>
  );
}
