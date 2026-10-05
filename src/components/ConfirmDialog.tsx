"use client";

import { Dialog, Flex, Button } from '@radix-ui/themes';
import React, { useEffect, useId, useRef, useState } from 'react';
import { FormInput } from './FormInput';

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
  /**
   * Confirmación escrita, para acciones destructivas de alcance amplio: muestra
   * un campo donde hay que teclear esta palabra y mantiene Confirmar
   * deshabilitado hasta que coincida (sin distinguir mayúsculas y sin contar
   * espacios en los extremos). El campo arranca vacío cada vez que se abre el
   * diálogo, Enter en él confirma (solo si la palabra coincide y no está
   * `busy`) y recupera el foco si `busy` termina con el diálogo aún abierto.
   * Sin esta prop el diálogo es exactamente el de siempre.
   */
  confirmationWord?: string;
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
  confirmationWord,
  open,
  onOpenChange
}: ConfirmDialogProps) {
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

        {/* Componente aparte para que el texto tecleado viva en un estado que
            se monta y desmonta con `Dialog.Content`: Radix lo desmonta al
            cerrar, así que el campo queda vacío en cada apertura sin importar
            si el cierre vino de Cancelar, de Esc o de un `open={false}` del
            llamador. */}
        <ConfirmDialogActions
          onConfirm={onConfirm}
          confirmText={confirmText}
          cancelText={cancelText}
          confirmColor={confirmColor}
          closeOnConfirm={closeOnConfirm}
          busy={busy}
          confirmationWord={confirmationWord}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}

type ConfirmDialogActionsProps = Required<
  Pick<ConfirmDialogProps, "onConfirm" | "confirmText" | "cancelText" | "confirmColor" | "closeOnConfirm" | "busy">
> &
  Pick<ConfirmDialogProps, "confirmationWord">;

function ConfirmDialogActions({
  onConfirm,
  confirmText,
  cancelText,
  confirmColor,
  closeOnConfirm,
  busy,
  confirmationWord,
}: ConfirmDialogActionsProps) {
  const inputId = useId();
  const [typedWord, setTypedWord] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const wasBusyRef = useRef(busy);

  const isWordMatched =
    confirmationWord === undefined ||
    typedWord.trim().toLowerCase() === confirmationWord.trim().toLowerCase();

  // Deshabilitar el campo con `busy` le quita el foco (se va al `body`). Si la
  // acción falla y el diálogo sigue abierto, se le devuelve, para que quien usa
  // teclado no quede fuera del diálogo. Se mira el `data-state` de Radix porque
  // en un cierre por éxito este componente sigue montado durante la animación
  // de salida, y ahí no hay que reenfocar nada.
  useEffect(() => {
    const wasBusy = wasBusyRef.current;
    wasBusyRef.current = busy;
    if (confirmationWord === undefined || !wasBusy || busy) return;
    const input = inputRef.current;
    if (input?.closest('[data-state="open"]')) input.focus();
  }, [busy, confirmationWord]);

  const confirmButton = (
    <Button
      ref={confirmButtonRef}
      onClick={onConfirm}
      variant="solid"
      color={confirmColor}
      disabled={busy || !isWordMatched}
    >
      {confirmText}
    </Button>
  );

  return (
    <>
      {confirmationWord !== undefined && (
        <FormInput
          ref={inputRef}
          id={inputId}
          label={`Escribe ${confirmationWord} para confirmar`}
          value={typedWord}
          onChange={(event) => setTypedWord(event.target.value)}
          // Enter equivale a pulsar Confirmar, solo si la palabra coincide y
          // no hay acción en curso; si no, no hace nada. Se delega en el
          // `click()` del botón para respetar `closeOnConfirm` (su
          // `Dialog.Close`) sin duplicar la lógica de cierre.
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (isWordMatched && !busy) confirmButtonRef.current?.click();
          }}
          disabled={busy}
          spellCheck={false}
        />
      )}

      <Flex gap="3" mt="4" justify="end">
        <Dialog.Close>
          <Button variant="soft" color="gray" className=" dark:bg-zinc-800! dark:text-white!" disabled={busy}>
            {cancelText}
          </Button>
        </Dialog.Close>
        {closeOnConfirm ? <Dialog.Close>{confirmButton}</Dialog.Close> : confirmButton}
      </Flex>
    </>
  );
}
