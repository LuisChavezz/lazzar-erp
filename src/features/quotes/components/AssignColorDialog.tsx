'use client';

/**
 * AssignColorDialog.tsx
 *
 * Asigna el color que le FALTA a una partida de catálogo cuyo producto tiene
 * variantes (EC-641). No cambia un color ya elegido: si la partida trae color,
 * el diálogo no ofrece nada que guardar.
 *
 * Las tallas de la partida se conservan tal cual. Por eso solo se pueden elegir
 * los colores cuyas variantes cubren TODAS esas tallas; los demás se muestran
 * deshabilitados con las tallas que les faltan (ver `getAssignableColors`).
 */

import { useState } from 'react';
import { Button } from '@/src/components/Button';
import { MainDialog } from '@/src/components/MainDialog';
import type { QuoteItem } from '../types';
import { getAssignableColors, type RequiredColorProduct } from '../utils/requiredColor';
import { ColorOption } from './ColorOption';

interface AssignColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Partida sin color. */
  item: QuoteItem | null;
  /** Catálogo del onboarding: de sus variantes salen los colores. */
  products: readonly RequiredColorProduct[];
  onSave: (updatedItem: QuoteItem) => void;
}

export function AssignColorDialog({
  open,
  onOpenChange,
  item,
  products,
  onSave,
}: AssignColorDialogProps) {
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const canAssign = Boolean(item && item.tipo === 'catalogo' && !item.colorId);
  const choices = item && canAssign ? getAssignableColors(item, products) : [];
  const selected = choices.find(
    (choice) => choice.color.id === selectedColorId && choice.missingSizes.length === 0
  );
  const hasEligible = choices.some((choice) => choice.missingSizes.length === 0);

  const handleSave = () => {
    if (!item || !selected) return;
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
        item?.descripcion
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
      {!canAssign ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esta partida ya tiene color.
        </p>
      ) : choices.length === 0 ? (
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
