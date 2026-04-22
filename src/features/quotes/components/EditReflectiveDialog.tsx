'use client';

/**
 * EditReflectiveDialog.tsx
 *
 * Diálogo enfocado para editar la configuración de reflejantes de una
 * partida específica de la cotización.
 *
 * Reutiliza:
 * - `StepReflective` (presentacional, sin cambios).
 * - `useEditReflectiveDialog` (hook contenedor de estado).
 * - `MainDialog` (shell del diálogo).
 * - `Button` (acciones).
 *
 * La clave `key` en el lugar de uso (QuoteForm) fuerza el remount del
 * componente cada vez que cambia la partida seleccionada, garantizando
 * que `useReflectiveState` se inicialice limpiamente sin reset manual.
 */

import { Button } from '@/src/components/Button';
import { MainDialog } from '@/src/components/MainDialog';
import { EditIcon } from '@/src/components/Icons';
import type { QuoteItem } from '../types';
import { useEditReflectiveDialog } from '../hooks/useEditReflectiveDialog';
import { StepReflective } from './StepReflective';

interface EditReflectiveDialogProps {
  /** Controla la visibilidad del diálogo. */
  open: boolean;
  /** Callback de apertura/cierre. */
  onOpenChange: (open: boolean) => void;
  /** Partida cuya configuración de reflejante se va a editar. */
  item: QuoteItem | null;
  /** Callback invocado con el item actualizado al guardar. */
  onSave: (updatedItem: QuoteItem) => void;
}

/**
 * `EditReflectiveDialog`
 * Diálogo de paso único que permite editar la configuración de reflejantes
 * de una partida ya agregada a la cotización.
 */
export function EditReflectiveDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: EditReflectiveDialogProps) {
  const {
    reflectiveStepProps,
    handleSave,
    handleOpenChange,
    handleRemoveReflective,
  } = useEditReflectiveDialog({ item, onOpenChange });

  return (
    <MainDialog
      maxWidth="720px"
      open={open}
      onOpenChange={handleOpenChange}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <EditIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Configuración de reflejante
        </span>
      }
      description={
        item?.descripcion
          ? `Editando reflejante para: ${item.descripcion}`
          : 'Configura las especificaciones de reflejante para esta partida.'
      }
      actionButton={
        <div className="flex items-center gap-2">
          {/* Botón de eliminación: solo visible cuando el item ya tiene reflejante activo */}
          {item?.reflejantes?.activo && (
            <Button
              variant="danger"
              onClick={() => handleRemoveReflective(onSave)}
            >
              Quitar reflejante
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
      <StepReflective {...reflectiveStepProps} />
    </MainDialog>
  );
}
