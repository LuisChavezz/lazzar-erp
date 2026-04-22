'use client';

/**
 * EditEmbroideryDialog.tsx
 *
 * Diálogo enfocado para editar la configuración de bordado de una
 * partida específica de la cotización.
 *
 * Reutiliza:
 * - `StepEmbroidery` (presentacional, sin cambios).
 * - `useEditEmbroideryDialog` (hook contenedor de estado).
 * - `MainDialog` (shell del diálogo).
 * - `Button` (acciones).
 */

import { Button } from '@/src/components/Button';
import { MainDialog } from '@/src/components/MainDialog';
import { EditIcon } from '@/src/components/Icons';
import type { QuoteItem } from '../types';
import { useEditEmbroideryDialog } from '../hooks/useEditEmbroideryDialog';
import { StepEmbroidery } from './StepEmbroidery';

interface EditEmbroideryDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de apertura/cierre. */
  onOpenChange: (open: boolean) => void;
  /** Partida cuya configuración de bordado se va a editar. */
  item: QuoteItem | null;
  /** Callback invocado con el item actualizado al guardar. */
  onSave: (updatedItem: QuoteItem) => void;
}

/**
 * `EditEmbroideryDialog`
 * Diálogo de paso único que permite editar la configuración de bordado
 * de una partida ya agregada a la cotización.
 *
 * La clave `key` en el lugar de uso (QuoteForm) fuerza el remount del
 * componente cada vez que cambia la partida seleccionada, garantizando
 * que `useEmbroideryState` se inicialice limpiamente con los datos del
 * nuevo item sin lógica de reset manual.
 */
export function EditEmbroideryDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: EditEmbroideryDialogProps) {
  const { embroideryStepProps, handleSave, handleOpenChange, handleRemoveEmbroidery } =
    useEditEmbroideryDialog({ item, onOpenChange });

  return (
    <MainDialog
      maxWidth="720px"
      open={open}
      onOpenChange={handleOpenChange}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <EditIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Configuración de bordado
        </span>
      }
      description={
        item?.descripcion
          ? `Editando bordado para: ${item.descripcion}`
          : 'Configura las especificaciones de bordado para esta partida.'
      }
      actionButton={
        <div className="flex items-center gap-2">
          {/* Botón de eliminación: solo visible cuando el item ya tiene bordado activo */}
          {item?.bordados?.activo && (
            <Button
              variant="danger"
              onClick={() => handleRemoveEmbroidery(onSave)}
            >
              Quitar bordado
            </Button>
          )}
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
      <StepEmbroidery {...embroideryStepProps} />
    </MainDialog>
  );
}
