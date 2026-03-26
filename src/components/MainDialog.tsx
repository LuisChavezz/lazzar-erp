'use client';

import { Dialog, Flex, Button } from '@radix-ui/themes';
import React from 'react';

interface MainDialogProps {
  trigger?: React.ReactNode; // El botón o elemento que abre el modal
  title: React.ReactNode | string;
  description?: string;
  children: React.ReactNode; // El contenido dinámico (form, lista, etc.)
  maxWidth?: string;
  actionButton?: React.ReactNode; // Botón de acción principal opcional (ej: Guardar)
  actionButtonClose?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MainDialog({ 
  trigger, 
  title, 
  description, 
  children,
  maxWidth = "450px",
  actionButton,
  actionButtonClose = true,
  open,
  onOpenChange,
}: MainDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <Dialog.Trigger>
          {trigger}
        </Dialog.Trigger>
      )}

      <Dialog.Content
        maxWidth={maxWidth}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="bg-white! dark:bg-zinc-900! dark:text-white!"
      >
        <Dialog.Title>{title}</Dialog.Title>
        
        {description && (
          <Dialog.Description size="2" mb="4">
            {description}
          </Dialog.Description>
        )}

        {/* Contenido dinámico */}
        {children}

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              className="bg-rose-50! text-rose-700! hover:bg-rose-100! dark:bg-rose-500/15! dark:text-rose-300! dark:hover:bg-rose-500/25!"
            >
              Cerrar
            </Button>
          </Dialog.Close>

          {actionButton &&
            (actionButtonClose ? (
              <Dialog.Close>{actionButton}</Dialog.Close>
            ) : (
              actionButton
            ))}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
