
import { Dialog, Flex, Button } from '@radix-ui/themes';
import React from 'react';

interface ConfirmDialogProps {
  trigger?: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  maxWidth?: string;
  confirmColor?: "red" | "blue" | "green" | "gray" | "orange" | "amber" | "yellow" | "lime" | "cyan" | "violet" | "purple" | "pink" | "crimson" | "plum" | "tomato" | "teal" | "gold" | "bronze" | "brown" | "grass" | "mint" | "sky" | "jade" | "iris" | "ruby";
  /**
   * Por defecto el botón de confirmar cierra el diálogo al instante, así que un
   * `confirmText` que refleje estado pendiente nunca alcanza a pintarse. Con
   * `false` el diálogo queda abierto y cerrarlo es responsabilidad de quien lo
   * usa (típicamente en el `onSettled` de la mutación).
   */
  closeOnConfirm?: boolean;
  /**
   * Acción en curso: deshabilita Confirmar Y Cancelar e ignora Esc y el clic
   * fuera, así que el diálogo no puede cerrarse ni reenviarse mientras dure.
   * Pensado para mutaciones no idempotentes con `closeOnConfirm={false}`.
   */
  busy?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  maxWidth = "450px",
  confirmColor = "red",
  closeOnConfirm = true,
  busy = false,
  open,
  onOpenChange
}: ConfirmDialogProps) {
  const confirmButton = (
    <Button onClick={onConfirm} variant="solid" color={confirmColor} disabled={busy}>
      {confirmText}
    </Button>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <Dialog.Trigger>
          {trigger}
        </Dialog.Trigger>
      )}

      <Dialog.Content
        maxWidth={maxWidth}
        className="bg-white! dark:bg-zinc-900! dark:text-white!"
        onEscapeKeyDown={busy ? (event) => event.preventDefault() : undefined}
        onPointerDownOutside={busy ? (event) => event.preventDefault() : undefined}
        onInteractOutside={busy ? (event) => event.preventDefault() : undefined}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {description}
        </Dialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" className=" dark:bg-zinc-800! dark:text-white!" disabled={busy}>
              {cancelText}
            </Button>
          </Dialog.Close>
          {closeOnConfirm ? <Dialog.Close>{confirmButton}</Dialog.Close> : confirmButton}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
