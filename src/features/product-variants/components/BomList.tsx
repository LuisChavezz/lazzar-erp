"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useBom } from "@/src/features/bom/hooks/useBom";
import { useDeleteBomDetalle } from "@/src/features/bom/hooks/useDeleteBomDetalle";
import { usePatchBomMateriaPrima } from "@/src/features/bom/hooks/usePatchBomMateriaPrima";
import type { BomDetalle } from "@/src/features/bom/interfaces/bom.interface";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import type { UnitOfMeasure } from "@/src/features/units-of-measure/interfaces/unit-of-measure.interface";
import { Button } from "@/src/components/Button";
import { DeleteIcon } from "@/src/components/Icons";
import { ErrorState } from "../../../components/ErrorState";

/** Borrador editable de un renglón (solo los campos modificables en línea). */
type DraftRow = {
  /** Decimal como string, igual que `BomDetalle.cantidad`. */
  cantidad: string;
  unidad: number;
  obligatorio: boolean;
};

/** Cambios del usuario por renglón, superpuestos sobre los datos vivos. */
type DraftMap = Record<number, Partial<DraftRow>>;

/** Píldora booleana con el mismo estilo que el badge "Estado" de las variantes */
const BoolBadge = ({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) => {
  const styles = value
    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
    : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
};

interface DetalleTableProps {
  detalles: BomDetalle[];
  onDelete: (id: number) => void;
  isPending: boolean;
  /** Cuando es `true`, las celdas editables se reemplazan por inputs en línea. */
  isEditing: boolean;
  units: UnitOfMeasure[];
  draft: DraftMap;
  setDraft: React.Dispatch<React.SetStateAction<DraftMap>>;
}

/**
 * Tabla con los renglones de materia prima de la lista de materiales.
 *
 * En modo edición (`isEditing`) reemplaza las celdas de cantidad, unidad y
 * obligatorio por inputs en línea ligados al borrador (`draft`). Se usan
 * inputs nativos compactos (y no `FormSelect`/`FormToggle`) porque esas
 * primitivas son de ancho completo y están pensadas para formularios, no para
 * celdas densas de tabla.
 */
const DetalleTable = ({
  detalles,
  onDelete,
  isPending,
  isEditing,
  units,
  draft,
  setDraft,
}: DetalleTableProps) => {
  if (detalles.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-8 text-center">
        Esta variante no tiene materiales registrados.
      </p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Componente</th>
            <th className="px-3 py-2 font-medium text-right">Cantidad</th>
            <th className="px-3 py-2 font-medium">Unidad</th>
            <th className="px-3 py-2 font-medium text-center">Obligatorio</th>
            <th className="px-3 py-2 font-medium text-center">Activo</th>
            {!isEditing && (
              <th className="px-3 py-2 font-medium text-center">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {detalles.map((item) => {
            const row = draft[item.bom_detalle_id];
            const cantidad = row?.cantidad ?? item.cantidad;
            const unidad = row?.unidad ?? item.unidad;
            const obligatorio = row?.obligatorio ?? item.obligatorio;

            // Aplica un cambio parcial al borrador del renglón conservando los
            // valores actuales (defensivo por si el borrador aún no se sembró).
            const patchDraft = (patch: Partial<DraftRow>) =>
              setDraft((prev) => ({
                ...prev,
                [item.bom_detalle_id]: {
                  ...prev[item.bom_detalle_id],
                  ...patch,
                },
              }));

            return (
              <tr
                key={item.bom_detalle_id}
                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {item.componente_nombre ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={cantidad}
                      onChange={(e) => patchDraft({ cantidad: e.target.value })}
                      className="w-20 text-right tabular-nums rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  ) : (
                    item.cantidad
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {isEditing ? (
                    <select
                      value={unidad}
                      onChange={(e) =>
                        patchDraft({ unidad: Number(e.target.value) })
                      }
                      className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      {units.map((u) => (
                        <option
                          key={u.id}
                          value={u.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {u.clave} — {u.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.unidad_clave ?? "—"
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={obligatorio}
                      onChange={(e) =>
                        patchDraft({ obligatorio: e.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer accent-sky-600"
                    />
                  ) : (
                    <BoolBadge
                      value={item.obligatorio}
                      trueLabel="Sí"
                      falseLabel="No"
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolBadge
                    value={item.activo}
                    trueLabel="Activo"
                    falseLabel="Inactivo"
                  />
                </td>
                {!isEditing && (
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.bom_detalle_id)}
                      disabled={isPending}
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface BomListProps {
  /** Identificador de la variante de producto cuya lista de materiales se consulta. */
  productoVarianteId: number;
  /**
   * Modo de presentación. `view` (por defecto) es solo lectura; `edit` habilita
   * la edición en línea de los renglones y muestra los controles Guardar/Cancelar.
   * El modo lo decide quien abre el diálogo, no este componente.
   */
  mode?: "view" | "edit";
  /** Cierra el diálogo contenedor (tras guardar o cancelar en modo edición). */
  onClose?: () => void;
}

/**
 * Vista de la lista de materiales (BOM) de una variante de producto. Pensada
 * para usarse como contenido de `MainDialog`.
 *
 * En modo `view` es de solo lectura (con botón de eliminar por renglón). En
 * modo `edit` permite modificar cantidad, unidad y obligatorio de cada renglón
 * y persiste los cambios con un `PATCH` que reemplaza todo el detalle.
 */
export default function BomList({
  productoVarianteId,
  mode = "view",
  onClose,
}: BomListProps) {
  const isEditing = mode === "edit";
  const queryKey = ["bom", productoVarianteId];
  const { bom, isLoading, isError, error } = useBom(productoVarianteId);
  const { mutate: deleteMutate, isPending } = useDeleteBomDetalle(queryKey);
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();
  const { mutate: patchMutate, isPending: isSaving } =
    usePatchBomMateriaPrima();

  // Cambios del usuario superpuestos sobre los datos vivos. No se siembra: cada
  // celda lee `draft[id]?.campo ?? item.campo`, así que basta un overlay parcial
  // (y se evita sincronizar props→estado con un efecto).
  const [draft, setDraft] = useState<DraftMap>({});

  // El endpoint devuelve un arreglo de BOM; se aplanan sus renglones de detalle.
  const detalles = bom.flatMap((b) => b.materia_prima_detalle);

  // En modo edición también se espera al catálogo de unidades: el <select> de
  // unidad se queda sin opciones (y muestra la unidad en blanco) si renderiza
  // antes de que carguen las unidades. Mismo criterio que ProductionOrderStep2.
  if (isLoading || (isEditing && isLoadingUnits)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando lista de materiales...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar la lista de materiales"
        message={(error as Error)?.message}
      />
    );
  }

  // Guarda el estado completo deseado del detalle (el PATCH reemplaza todo el
  // arreglo). Se opera sobre la BOM primaria de la variante (1 BOM por variante).
  const handleSave = () => {
    const targetBom = bom[0];
    if (!targetBom) return;

    const materia_prima_detalle: BomDetalle[] =
      targetBom.materia_prima_detalle.map((item) => ({
        ...item,
        cantidad: draft[item.bom_detalle_id]?.cantidad ?? item.cantidad,
        unidad: draft[item.bom_detalle_id]?.unidad ?? item.unidad,
        obligatorio:
          draft[item.bom_detalle_id]?.obligatorio ?? item.obligatorio,
      }));

    // El PATCH reemplaza todo el arreglo: una sola cantidad vacía o no positiva
    // (p. ej. al limpiar el input) abortaría el guardado completo. Se valida en
    // cliente antes de enviar (mismo criterio que el alta: cantidad > 0).
    const cantidadInvalida = materia_prima_detalle.some(
      (d) => !(Number(d.cantidad) > 0)
    );
    if (cantidadInvalida) {
      toast.error("Cada material debe tener una cantidad mayor a 0");
      return;
    }

    patchMutate(
      { bom_id: targetBom.bom_id, materia_prima_detalle },
      { onSuccess: () => onClose?.() }
    );
  };

  return (
    <div className="space-y-4">
      {isEditing && (
        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            rounded="full"
            onClick={handleSave}
            disabled={isSaving || bom.length === 0}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}
      <DetalleTable
        detalles={detalles}
        onDelete={deleteMutate}
        isPending={isPending}
        isEditing={isEditing}
        units={units}
        draft={draft}
        setDraft={setDraft}
      />
    </div>
  );
}
