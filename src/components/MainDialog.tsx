'use client';

import { Dialog, Flex, Button } from '@radix-ui/themes';
import React from 'react';

interface MainDialogProps {
  trigger: React.ReactNode; // El botón o elemento que abre el modal
  title: React.ReactNode | string;
  description?: string;
  children: React.ReactNode; // El contenido dinámico (form, lista, etc.)
  maxWidth?: string;
  actionButton?: React.ReactNode; // Botón de acción principal opcional (ej: Guardar)
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
  open,
  onOpenChange
}: MainDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        {trigger}
      </Dialog.Trigger>

      <Dialog.Content maxWidth={maxWidth} className="bg-white! dark:bg-zinc-900! dark:text-white!">
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
            <Button variant="soft" color="gray" className=" dark:bg-zinc-800! dark:text-white!">
              Cerrar
            </Button>
          </Dialog.Close>
          
          {actionButton && (
            <Dialog.Close>
               {/* Nota: Para formularios reales que requieren validación, 
                   se necesitaría manejar el estado 'open' externamente.
                   Para este demo y acciones simples, esto funciona bien. */}
               {actionButton}
            </Dialog.Close>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
