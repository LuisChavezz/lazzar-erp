"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { observeSessionUser } from "../utils/sessionUserSwitch";

/**
 * Primer usuario autenticado que vio ESTE documento. Vive a nivel de módulo, no
 * en el componente, para sobrevivir a los remontajes entre los layouts de
 * (Main) y de /select-branch (cada uno con su `SessionProvider`) dentro de la
 * misma carga de página; una recarga lo reinicia, que es justo lo que se busca.
 */
let observedUserId: string | undefined;

/**
 * Recarga la pestaña si su sesión pasa de un usuario a OTRO sin recargar
 * (EC-848). Pasa cuando la sesión de A caduca sin cerrarla, B inicia sesión en
 * otra pestaña y next-auth avisa a esta por el evento `storage`: la pestaña
 * relee la sesión, sigue `authenticated` (ahora como B) y mostraría la caché
 * de TanStack Query de A. La recarga la descarta y deja que el proxy decida la
 * ruta con la sesión de B.
 *
 * No limpia el workspace: el inicio de sesión de B ya lo hizo
 * (`enterNewSession`), y para cuando esta pestaña se entera B pudo haber
 * elegido ya su sucursal en la otra.
 *
 * No necesita guarda contra ciclos como la de `sessionRecovery`: tras la
 * recarga `observedUserId` vuelve a empezar vacío y el primer id que llega es
 * la referencia, así que la recarga no puede volver a dispararse sola. Las
 * reglas viven en `observeSessionUser`.
 *
 * Vive en los layouts de (Main) y de /select-branch; no pinta nada.
 */
export function SessionUserWatcher() {
  const { data: session, status } = useSession();
  const userId = status === "authenticated" ? session?.user?.id : undefined;

  useEffect(() => {
    const { observed, reload } = observeSessionUser(observedUserId, userId);
    observedUserId = observed;
    if (reload) window.location.reload();
  }, [userId]);

  return null;
}
