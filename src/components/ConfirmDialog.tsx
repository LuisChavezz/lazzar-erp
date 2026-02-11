
import { Dialog, Flex, Button } from '@radix-ui/themes';
import React from 'react';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  maxWidth?: string;
  confirmColor?: "red" | "blue" | "green" | "gray" | "orange" | "amber" | "yellow" | "lime" | "cyan" | "violet" | "purple" | "pink" | "crimson" | "plum" | "tomato" | "teal" | "gold" | "bronze" | "brown" | "grass" | "mint" | "sky" | "jade" | "iris" | "ruby";
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  maxWidth = "450px",
  confirmColor = "red"
}: ConfirmDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        {trigger}
      </Dialog.Trigger>

      <Dialog.Content maxWidth={maxWidth} className="bg-white! dark:bg-zinc-900! dark:text-white!">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {description}
        </Dialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" className=" dark:bg-zinc-800! dark:text-white!">
              {cancelText}
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={onConfirm} variant="solid" color={confirmColor}>
              {confirmText}
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
