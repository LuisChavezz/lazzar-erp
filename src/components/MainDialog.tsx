'use client';

import { Dialog, Flex, Button } from '@radix-ui/themes';
import React from 'react';

interface MainDialogProps {
  trigger: React.ReactNode; // El botón o elemento que abre el modal
  title: string;
  description?: string;
  children: React.ReactNode; // El contenido dinámico (form, lista, etc.)
  maxWidth?: string;
  actionButton?: React.ReactNode; // Botón de acción principal opcional (ej: Guardar)
}

export function MainDialog({ 
  trigger, 
  title, 
  description, 
  children,
  maxWidth = "450px",
  actionButton
}: MainDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        {trigger}
      </Dialog.Trigger>

      <Dialog.Content maxWidth={maxWidth}>
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
            <Button variant="soft" color="gray">
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
