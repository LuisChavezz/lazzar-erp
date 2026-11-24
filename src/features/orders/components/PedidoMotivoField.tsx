"use client";

import { FormTextarea } from "@/src/components/FormTextarea";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  PEDIDO_CANCEL_MOTIVO_MAX,
  fitPedidoCancelMotivo,
  pedidoCancelMotivoLength,
} from "../schemas/pedido-cancel.schema";

interface PedidoMotivoFieldProps {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  error?: FormFieldError;
  /** El texto ya recortado al tope, para el estado del formulario. */
  onValueChange: (value: string) => void;
  onBlur: () => void;
}

/**
 * Motivo obligatorio de una acción sobre el pedido (cancelar, retener): texto
 * libre en mayúsculas (`forceUppercase`, como el resto del pedido) con contador
 * `n/500` y el tope del backend al escribir (500 code points del texto
 * recortado, `PEDIDO_CANCEL_MOTIVO_MAX`).
 *
 * Sin `maxLength` nativo: cuenta otra cosa que el backend; el tope lo pone
 * `fitPedidoCancelMotivo`. Sin validación en blur: al pulsar "Volver" o al
 * cerrar, pintaría el error de obligatorio con el campo vacío. Se valida al
 * enviar.
 */
export function PedidoMotivoField({
  name,
  label,
  placeholder,
  value,
  disabled,
  error,
  onValueChange,
  onBlur,
}: PedidoMotivoFieldProps) {
  return (
    <div>
      <FormTextarea
        label={label}
        name={name}
        rows={3}
        placeholder={placeholder}
        value={value}
        forceUppercase
        disabled={disabled}
        error={error}
        onChange={(event) => {
          const textarea = event.currentTarget;
          const fitted = fitPedidoCancelMotivo(value, textarea.value);
          // El recorte se escribe en el DOM ANTES de pasarlo al estado, con el
          // cursor al final de lo que sí entró: así el valor del DOM ya
          // coincide con el del estado, React no lo reescribe y el cursor no
          // salta al final (mismo truco que `forceUppercase` en `FormTextarea`).
          if (fitted) {
            textarea.value = fitted.value;
            textarea.setSelectionRange(fitted.caret, fitted.caret);
          }
          onValueChange(textarea.value);
        }}
        onBlur={onBlur}
      />
      <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
        {pedidoCancelMotivoLength(value)}/{PEDIDO_CANCEL_MOTIVO_MAX}
      </p>
    </div>
  );
}
