"use client";

import { useState } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import {
  EmptyLines,
  InfoTile,
  InfoTileGrid,
  LineItemsTable,
  SectionTitle,
} from "@/src/components/DetailDialogPrimitives";
import { FormInput } from "@/src/components/FormInput";
import { WarningFilledIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { MainDialog } from "@/src/components/MainDialog";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { ROTATION_ESTADO_CONFIG } from "../constants/rotationBoardStatus";
import { useVariantMaterialNeeds } from "../hooks/useVariantMaterialNeeds";
import type { RotationBoardRow } from "../interfaces/rotation-board.interface";
import type { VariantMaterial } from "../interfaces/variant-materials.interface";
import { materialsCantidadSchema } from "../schemas/rotationBoardControls.schema";
import { formatPieces, rotationBoardFieldErrorMessage } from "../utils/rotationBoardFormat";

/** Pausa antes de pedir el desglose de una cantidad nueva. */
const CANTIDAD_DEBOUNCE_MS = 500;

/** Cantidad inicial: el resurtido sugerido, o 1 si no hay. */
export const initialMaterialsCantidad = (row: RotationBoardRow): number =>
  row.resurtido_sugerido > 0 ? row.resurtido_sugerido : 1;

/** Cantidad de un insumo (hasta 4 decimales, como el inventario) y su unidad. */
const quantity = (value: number | null, unit: string | null) =>
  value === null ? "—" : `${formatExactQuantityValue(value)}${unit ? ` ${unit}` : ""}`;

function MaterialRow({ material }: { material: VariantMaterial }) {
  const missingUnit = material.unidad_inventario === null;
  return (
    <tr className={material.faltante > 0 ? "bg-rose-50/60 dark:bg-rose-500/5" : undefined}>
      <td className="px-3 py-2">
        <p className="font-medium text-slate-700 dark:text-slate-200">
          {material.componente_nombre}
        </p>
        {material.unidad_inconsistente && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <WarningFilledIcon className="h-3 w-3" aria-hidden />
            {missingUnit
              ? "El insumo no tiene unidad de inventario"
              : "Unidad del BOM distinta a la del inventario"}
          </p>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-xs">
        <span title="Unidad del BOM">{material.unidad_bom ?? "—"}</span>
        <span className="text-slate-400"> / </span>
        <span
          title="Unidad de inventario"
          className={missingUnit ? "font-semibold text-amber-700 dark:text-amber-400" : undefined}
        >
          {material.unidad_inventario ?? "Sin unidad"}
        </span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {quantity(material.por_pieza, material.unidad_bom)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {quantity(material.existencia, material.unidad_inventario)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPieces(material.alcanza_para)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {quantity(material.requerido, material.unidad_bom)}
      </td>
      <td
        className={`px-3 py-2 text-right tabular-nums ${
          material.faltante > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : ""
        }`}
      >
        {quantity(material.faltante, material.unidad_inventario)}
      </td>
    </tr>
  );
}

interface MaterialsContentProps {
  row: RotationBoardRow;
  /** Sucursal del tablero al abrir (`null` = todas las del usuario). */
  sucursal: number | null;
}

/**
 * Contenido del detalle de UN SKU: datos de la fila al abrir (la copia de
 * `useDialogSession`, así que sobrevive a que la fila salga del filtro o de la
 * página) y el desglose del BOM para `cantidad` piezas.
 */
function MaterialsContent({ row, sucursal }: MaterialsContentProps) {
  const [draft, setDraft] = useState(String(initialMaterialsCantidad(row)));
  // La cantidad que se consulta: el último borrador VÁLIDO tras la pausa. Uno
  // inválido muestra su motivo y no consulta (se queda la anterior).
  const [cantidad, setCantidad] = useState(initialMaterialsCantidad(row));
  const debouncedDraft = useDebounce(draft, CANTIDAD_DEBOUNCE_MS);
  const parsedDebounced = materialsCantidadSchema.safeParse(debouncedDraft);
  if (parsedDebounced.success && parsedDebounced.data !== cantidad) {
    setCantidad(parsedDebounced.data);
  }

  const parsedDraft = materialsCantidadSchema.safeParse(draft);
  const draftError = parsedDraft.success ? undefined : parsedDraft.error.issues[0]?.message;

  const { needs, isLoading, isFetching, isPlaceholderData, isInitialError, isNotFound, error, cantidadError, refetch } =
    useVariantMaterialNeeds(row.variante_id, cantidad, sucursal);

  // El error del campo: primero el del cliente (no es un entero ≥ 1), luego el
  // del backend (p. ej. el tope de 1 000 000), con su texto tal cual.
  const fieldError = draftError ?? cantidadError;
  // Error por campo del backend fuera de `cantidad` (400): no se arregla repitiendo.
  const fieldErrorMessage = rotationBoardFieldErrorMessage(error);
  const isStale = isPlaceholderData || (isFetching && !needs);

  return (
    <div className="space-y-5">
      <InfoTileGrid>
        <InfoTile label="SKU">{row.sku ?? "—"}</InfoTile>
        <InfoTile label="Color / talla">
          {`${row.color ?? "—"} / ${row.talla ?? "—"}`}
        </InfoTile>
        <InfoTile label="Estado">
          <StatusBadge status={row.estado} config={ROTATION_ESTADO_CONFIG} />
        </InfoTile>
        <InfoTile label="Resurtido sugerido">{formatPieces(row.resurtido_sugerido)}</InfoTile>
        <InfoTile label="Disponible">{formatPieces(row.disponible)}</InfoTile>
        <InfoTile label="Fabricable con existencia">
          {needs ? formatPieces(needs.fabricable_con_existencia) : formatPieces(row.fabricable_con_existencia)}
        </InfoTile>
      </InfoTileGrid>

      <div className="flex flex-wrap items-start gap-4">
        <div className="w-44">
          <FormInput
            id="rotation-materials-cantidad"
            name="cantidad"
            label="Piezas a fabricar"
            variant="compact"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            error={fieldError ? { message: fieldError } : undefined}
          />
        </div>
        {needs && !cantidadError && (
          <div className="pt-5 text-sm" aria-live="polite">
            {needs.puede_fabricar === true && (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Alcanza para {formatPieces(needs.cantidad)} piezas
              </span>
            )}
            {needs.puede_fabricar === false && (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                No alcanza: limita {needs.limitante?.componente_nombre ?? "un insumo"}
              </span>
            )}
            {needs.puede_fabricar === null && needs.tiene_bom && (
              <span className="text-slate-500">No se puede calcular con este BOM</span>
            )}
          </div>
        )}
      </div>

      {needs?.bom_con_alertas && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <WarningFilledIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">BOM con alertas.</span> Algún insumo pide una unidad
            distinta a la de su inventario (o no tiene unidad) o tiene cantidad 0. El cálculo no
            convierte unidades, así que estas cifras pueden no ser reales.
          </p>
        </div>
      )}

      <div aria-busy={isStale || undefined}>
        <SectionTitle>Materiales del BOM</SectionTitle>
        {isNotFound ? (
          <EmptyLines>Esta variante ya no está disponible.</EmptyLines>
        ) : isInitialError && !cantidadError ? (
          // Un 400 por campo (p. ej. `sucursal` ajena o fuera de alcance) falla
          // igual al repetirlo: sin "Reintentar". Red o 5xx sí lo ofrecen.
          fieldErrorMessage ? (
            <SectionErrorNotice title="No se pudo cargar el desglose" message={fieldErrorMessage} />
          ) : (
            <SectionErrorNotice
              title="No se pudo cargar el desglose"
              message={extractErrorMessage(error, "Intenta de nuevo en unos momentos.")}
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          )
        ) : isLoading && !needs ? (
          <LoadingSkeleton className="h-40" />
        ) : !needs ? (
          cantidadError ? (
            <EmptyLines>Corrige la cantidad para ver el desglose.</EmptyLines>
          ) : null
        ) : !needs.tiene_bom ? (
          <EmptyLines>Esta variante no tiene un BOM activo.</EmptyLines>
        ) : needs.materiales.length === 0 ? (
          <EmptyLines>El BOM no tiene insumos activos.</EmptyLines>
        ) : (
          <div className={isStale ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-semibold">Insumo</th>
                  <th className="px-3 py-2 font-semibold">Unidad BOM / inv.</th>
                  <th className="px-3 py-2 text-right font-semibold">Por pieza</th>
                  <th className="px-3 py-2 text-right font-semibold">Existencia</th>
                  <th className="px-3 py-2 text-right font-semibold">Alcanza (pzas)</th>
                  <th className="px-3 py-2 text-right font-semibold">Requerido</th>
                  <th className="px-3 py-2 text-right font-semibold">Faltante</th>
                </>
              }
            >
              {needs.materiales.map((material) => (
                <MaterialRow key={material.componente_id} material={material} />
              ))}
            </LineItemsTable>
          </div>
        )}
      </div>
    </div>
  );
}

interface VariantMaterialsDialogProps {
  /** Fila elegida; `null` = cerrado. */
  row: RotationBoardRow | null;
  /** Sucursal del filtro del tablero (`null` = todas las del usuario). */
  sucursal: number | null;
  onClose: () => void;
}

/**
 * Detalle de materiales de un SKU (solo con agrupación por variante). Lo monta
 * la vista, no la celda. `useDialogSession` guarda la fila al ABRIR: si un
 * refetch la saca del filtro o de la página, el diálogo sigue con sus datos
 * (y conserva el contenido durante la animación de cierre). La sucursal se
 * guarda con ella: el desglose es el de la fila tal como se abrió.
 */
export function VariantMaterialsDialog({ row, sucursal, onClose }: VariantMaterialsDialogProps) {
  const open = row !== null;
  const session = useDialogSession(open, row === null ? null : { row, sucursal });
  const snapshot = session.snapshot?.row ?? null;

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      maxWidth="960px"
      title={
        <DialogHeader
          title={snapshot?.producto_nombre ?? "Materiales"}
          subtitle={snapshot?.sku ? `Materiales · ${snapshot.sku}` : "Materiales"}
          statusColor="sky"
        />
      }
    >
      {snapshot && snapshot.variante_id !== null && (
        <MaterialsContent
          key={session.id}
          row={snapshot}
          sucursal={session.snapshot?.sucursal ?? null}
        />
      )}
    </MainDialog>
  );
}
