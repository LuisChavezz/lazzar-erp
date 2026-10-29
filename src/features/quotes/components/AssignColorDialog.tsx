'use client';

/**
 * AssignColorDialog.tsx
 *
 * Asigna el color que le FALTA a una partida de catálogo cuyo producto tiene
 * variantes (EC-641). No cambia un color ya elegido: solo se abre desde una
 * partida que no lo tiene.
 *
 * Las tallas de la partida se conservan tal cual. Por eso solo se pueden elegir
 * los colores cuyas variantes cubren TODAS esas tallas; los demás se muestran
 * deshabilitados con las tallas que les faltan (ver `getAssignableColors`).
 */

import { useState } from 'react';
import { Button } from '@/src/components/Button';
import { MainDialog } from '@/src/components/MainDialog';
import { useDialogSession } from '@/src/hooks/useDialogSession';
import type { QuoteItem } from '../types';
import { getAssignableColors, type RequiredColorProductsById } from '../utils/requiredColor';
import { ColorOption } from './ColorOption';

/** Partida de catálogo: la única que puede recibir un color. */
export type CatalogQuoteItem = Extract<QuoteItem, { tipo: 'catalogo' }>;

interface AssignColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Partida de catálogo SIN color. Quien abre el diálogo ya lo garantiza: solo
   * ofrece "Asignar color" en esas partidas. `null` mientras está cerrado.
   */
  item: CatalogQuoteItem | null;
  /** Catálogo del onboarding por id: de sus variantes salen los colores. */
  productsById: RequiredColorProductsById;
  onSave: (updatedItem: QuoteItem) => void;
}

/**
 * La partida se copia al ABRIR (`useDialogSession`): el contenido no se vacía
 * mientras el diálogo se cierra, y cada apertura monta uno nuevo por su `id`.
 */
export function AssignColorDialog({ open, item, ...rest }: AssignColorDialogProps) {
  const session = useDialogSession(open, item);
  if (!session.snapshot) return null;
  return (
    <AssignColorDialogContent key={session.id} open={open} item={session.snapshot} {...rest} />
  );
}

function AssignColorDialogContent({
  open,
  onOpenChange,
  item,
  productsById,
  onSave,
}: Omit<AssignColorDialogProps, 'item'> & { item: CatalogQuoteItem }) {
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const choices = getAssignableColors(item, productsById);
  const selected = choices.find(
    (choice) => choice.color.id === selectedColorId && choice.missingSizes.length === 0
  );
  const hasEligible = choices.some((choice) => choice.missingSizes.length === 0);

  const handleSave = () => {
    if (!selected) return;
    onSave({
      ...item,
      colorId: selected.color.id,
      colorNombre: selected.color.nombre,
      colorHex: selected.color.codigo_hex,
      availableSizes: selected.sizes,
    });
  };

  return (
    <MainDialog
      maxWidth="560px"
      open={open}
      onOpenChange={onOpenChange}
      actionButtonClose={false}
      title="Asignar color"
      description={
        item.descripcion
          ? `Partida sin color: ${item.descripcion}`
          : 'Elige el color de esta partida.'
      }
      actionButton={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!selected}>
            Asignar color
          </Button>
        </div>
      }
    >
      {choices.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          El producto no tiene colores disponibles en el catálogo.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Las tallas de la partida se conservan. Solo se pueden elegir los colores
            que tienen todas esas tallas.
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Colores disponibles para la partida"
          >
            {choices.map((choice) => (
              <ColorOption
                key={choice.color.id}
                color={choice.color}
                isSelected={selectedColorId === choice.color.id}
                onSelect={() => setSelectedColorId(choice.color.id)}
                disabledReason={
                  choice.missingSizes.length > 0
                    ? `No tiene ${choice.missingSizes.length === 1 ? 'la talla' : 'las tallas'} ${choice.missingSizes.join(', ')}`
                    : undefined
                }
              />
            ))}
          </div>
          {!hasEligible && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Ningún color tiene todas las tallas de la partida. Ajusta las tallas
              primero y vuelve a asignar el color.
            </p>
          )}
        </div>
      )}
    </MainDialog>
  );
}
