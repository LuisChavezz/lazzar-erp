'use client';

/**
 * EditSizesDialog.tsx
 *
 * Diálogo dedicado para editar las tallas de una partida ya agregada
 * a la cotización, sin necesidad de recorrer el flujo completo del
 * diálogo de onboarding.
 *
 * Diferencias clave con `EditEmbroideryDialog` / `EditReflectiveDialog`:
 * - No existe botón "Quitar tallas": una partida debe tener siempre al
 *   menos una talla con cantidad > 0.
 * - La validación muestra errores en el acordeón de `StepSizes` si algún
 *   producto no tiene ninguna cantidad asignada.
 * - Actualiza `cantidad` del item con la suma total de piezas al guardar.
 *
 * Reutiliza:
 * - `StepSizes` (presentacional, sin cambios).
 * - `useEditSizesDialog` (hook contenedor de estado).
 * - `MainDialog` (shell del diálogo).
 * - `Button` (acciones).
 */

import { Button } from '@/src/components/Button';
import { MainDialog } from '@/src/components/MainDialog';
import { EditIcon } from '@/src/components/Icons';
import type { Size } from '../../sizes/interfaces/size.interface';
import type { QuoteItem } from '../types';
import { useEditSizesDialog } from '../hooks/useEditSizesDialog';
import { StepSizes } from './StepSizes';

interface EditSizesDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de apertura/cierre. */
  onOpenChange: (open: boolean) => void;
  /** Partida cuyas tallas se van a editar. */
  item: QuoteItem | null;
  /** Catálogo completo de tallas disponibles. */
  sizes: Size[];
  /** Callback invocado con el item actualizado al guardar. */
  onSave: (updatedItem: QuoteItem) => void;
}

/**
 * `EditSizesDialog`
 * Diálogo de paso único que permite editar las cantidades por talla de
 * una partida ya agregada a la cotización.
 */
export function EditSizesDialog({
  open,
  onOpenChange,
  item,
  sizes,
  onSave,
}: EditSizesDialogProps) {
  const { sizesStepProps, handleSave, handleOpenChange } = useEditSizesDialog({
    item,
    sizes,
    onOpenChange,
  });

  return (
    <MainDialog
      maxWidth="720px"
      open={open}
      onOpenChange={handleOpenChange}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <EditIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Configuración de tallas
        </span>
      }
      description={
        item?.descripcion
          ? `Editando tallas para: ${item.descripcion}`
          : 'Configura las cantidades por talla para esta partida.'
      }
      actionButton={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(onSave)}
          >
            Guardar cambios
          </Button>
        </div>
      }
    >
      <StepSizes {...sizesStepProps} />
    </MainDialog>
  );
}
