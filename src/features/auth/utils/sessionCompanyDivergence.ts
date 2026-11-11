import type { SessionCompanySyncStatus } from "../stores/sessionCompanySync.store";

/**
 * Reglas del vigilante de empresa (`SessionCompanyWatcher`, EC-847).
 *
 * La pestaña trabaja con la empresa que su sincronización confirmó contra
 * `/auth/user/` (`confirmed`). Si la sesión del cliente se aparta de ella hay
 * dos causas posibles, indistinguibles desde la sesión:
 *
 * - Un `GET /api/auth/session` tardío reescribió la cookie con el token
 *   anterior a la sincronización (el caso que cubría la reaplicación de
 *   EC-842). El servidor sigue diciendo `confirmed`.
 * - La empresa cambió de verdad: otra pestaña llamó a `cambiar-empresa` y
 *   next-auth difundió su `update()` a esta. El servidor ya dice otra.
 *
 * Por eso no se reaplica a ciegas: se vuelve a preguntar al servidor, que es
 * la fuente de verdad, y se adopta lo que diga.
 */

/** Relecturas máximas por sincronización: acota cualquier ida y vuelta. */
export const MAX_DIVERGENCE_REREADS = 3;

interface DivergenceInput {
  /** Clave de la sincronización vigente de este usuario (`userId:attempt`). */
  currentKey: string;
  syncStatus: SessionCompanySyncStatus;
  confirmed: { key: string; empresa: number | null } | null;
  /** `session.user.empresa`; `undefined` también es desviación (ver abajo). */
  sessionEmpresa: number | null | undefined;
  /** La propia pestaña está cambiando de empresa y va a navegar. */
  switching: boolean;
  /** Relecturas ya hechas para `currentKey`. */
  rereadsDone: number;
}

/**
 * ¿Hay que volver a leer `/auth/user/`? Solo con la sincronización de este
 * usuario e intento TERMINADA (mientras corre, ella misma escribe la sesión) y
 * con la sesión distinta de la empresa confirmada. Una sesión sin la clave
 * (`undefined`) cuenta como desviación: tras la sincronización dejaría la
 * puerta de empresa en "cargando" para siempre (`resolveSessionCompany`).
 */
export const shouldRereadOnDivergence = ({
  currentKey,
  syncStatus,
  confirmed,
  sessionEmpresa,
  switching,
  rereadsDone,
}: DivergenceInput): boolean =>
  !switching &&
  syncStatus === "done" &&
  !!confirmed &&
  confirmed.key === currentKey &&
  sessionEmpresa !== confirmed.empresa &&
  rereadsDone < MAX_DIVERGENCE_REREADS;

/**
 * Qué hacer con la respuesta del servidor:
 * - `reapply`: el servidor sigue en la empresa de la pestaña; la desviación
 *   era un token viejo y se vuelve a escribir esa empresa en la sesión.
 * - `reload`: el servidor ya está en otra empresa; lo cargado en esta pestaña
 *   es de la anterior y se recarga. La carga nueva sincroniza la empresa.
 */
export const resolveDivergence = (
  confirmedEmpresa: number | null,
  serverEmpresa: number | null
): "reapply" | "reload" => (serverEmpresa === confirmedEmpresa ? "reapply" : "reload");

/**
 * Qué hacer si la relectura de `/auth/user/` FALLA (backend caído, red):
 * - `restore`: la sesión perdió la clave (`undefined`, un GET tardío con un
 *   token anterior a EC-842). Se vuelve a escribir la empresa confirmada sin
 *   esperar al servidor, como hacía la reaplicación de EC-842; si no, la puerta
 *   de empresa se queda en "cargando".
 * - `none`: la sesión trae otra empresa definida. Lo más probable es un cambio
 *   legítimo en otra pestaña, y reescribir la empresa vieja lo revertiría.
 */
export const resolveRereadFailure = (
  sessionEmpresa: number | null | undefined
): "restore" | "none" => (sessionEmpresa === undefined ? "restore" : "none");
