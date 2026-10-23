import type { QuoteFormValues } from "../schemas/quote.schema";

type ShippingPhoneValues = Pick<
  QuoteFormValues,
  "usarMismoTelefono" | "telefono_pagos" | "telefonoEnvio" | "celularEnvio"
>;

/**
 * Teléfonos de envío EFECTIVOS (EC-563, T-021): con "Usar el mismo teléfono"
 * marcada, el teléfono y el celular de envío SON `telefono_pagos`; se derivan
 * aquí en vez de copiarse al estado, así que lo que se muestra, se valida y se
 * envía no puede desincronizarse. Sin la casilla, los valores capturados.
 */
export const withMirroredShippingPhones = <T extends ShippingPhoneValues>(values: T): T =>
  values.usarMismoTelefono
    ? {
        ...values,
        telefonoEnvio: values.telefono_pagos ?? "",
        celularEnvio: values.telefono_pagos ?? "",
      }
    : values;
