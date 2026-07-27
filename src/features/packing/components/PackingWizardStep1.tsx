"use client";

import { useState } from "react";
import { Loader } from "@/src/components/Loader";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { usePackingOnboarding } from "../hooks/usePackingOnboarding";
import type { PackingStep1Values } from "../schemas/packing.schema";
import type { PackingOnboardingPicking } from "../interfaces/packing-onboarding.interface";

interface PackingWizardStep1Props {
  initialValues: PackingStep1Values;
  onNext: (values: PackingStep1Values) => void;
}

/**
 * Tope de resultados que devuelve `GET /wms/packings/onboarding/` (`[:50]` en
 * el servicio del backend, sin paginación ni filtro por texto).
 */
const PACKING_CATALOG_LIMIT = 50;

/**
 * Paso 1 del asistente de packing: elegir el picking origen, nada más —
 * operador/almacén/empresa/sucursal/pedido se heredan de él en el backend
 * (ver `packing.schema.ts`). El catálogo puede traer hasta 50 pickings sin
 * paginar ni filtrar por texto (confirmado en el backend), así que se navega
 * con un buscador en memoria (`SearchableSelectList`) en vez de un
 * `FormSelect` plano — mismo patrón de selección única embebida directamente
 * en el paso (sin el diálogo apilado de `SingleSelectPickerDialogContent`,
 * pensado para un selector de UN campo dentro de un formulario más grande)
 * que usa `ProductionOrderStep1` para su selección de variantes.
 */
export function PackingWizardStep1({ initialValues, onNext }: PackingWizardStep1Props) {
  const { data, isLoading, isError } = usePackingOnboarding();
  const pickings = data?.pickings ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(
    initialValues.picking > 0 ? initialValues.picking : null,
  );

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando pickings"
        message="Obteniendo pickings disponibles para empacar..."
      />
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudo cargar el catálogo de pickings
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  const canAdvance = selectedId !== null;
  // El backend corta el catálogo en 50 sin paginar ni aceptar un filtro de
  // texto, y la búsqueda de aquí abajo filtra SOLO lo ya cargado. Sin este
  // aviso, un picking fuera de la ventana se lee como "no existe" cuando en
  // realidad nunca llegó al cliente.
  const isCatalogCapped = pickings.length >= PACKING_CATALOG_LIMIT;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (selectedId !== null) onNext({ picking: selectedId });
      }}
      className="w-full space-y-5"
    >
      {isCatalogCapped && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
          Mostrando los {PACKING_CATALOG_LIMIT} pickings más recientes. La búsqueda solo
          filtra esta lista: si no encuentras uno más antiguo, puede estar fuera de ella.
        </p>
      )}

      <SearchableSelectList<PackingOnboardingPicking>
        items={pickings}
        searchPlaceholder="Buscar picking por folio, pedido, cliente o almacén..."
        filterPredicate={(picking, term) =>
          picking.folio.toLowerCase().includes(term) ||
          (picking.pedido_folio ?? "").toLowerCase().includes(term) ||
          (picking.cliente_nombre ?? "").toLowerCase().includes(term) ||
          (picking.almacen_nombre ?? "").toLowerCase().includes(term)
        }
        getKey={(picking) => picking.id}
        isSelected={(picking) => picking.id === selectedId}
        onSelect={(picking) =>
          setSelectedId((prev) => (prev === picking.id ? null : picking.id))
        }
        emptyMessage="No hay pickings disponibles para empacar."
        noResultsMessage="No se encontraron pickings"
        renderIndicator={renderRadioIndicator}
        renderContent={(picking) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {picking.folio}
              </p>
              {picking.pedido_folio && (
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                  {picking.pedido_folio}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {picking.cliente_nombre ?? "—"} · {picking.almacen_nombre ?? "—"}
            </p>
          </>
        )}
      />

      <div className="flex items-center justify-end gap-3 pt-1">
        <FormSubmitButton isPending={false} disabled={!canAdvance}>
          Continuar a empacar
        </FormSubmitButton>
      </div>
    </form>
  );
}
