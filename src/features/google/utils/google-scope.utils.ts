/* Fragmentos de URL que identifican cada permiso de Google en el campo `scope` */
export const SCOPE_KEYS = {
  drive: "googleapis.com/auth/drive",
  gmail: "googleapis.com/auth/gmail",
  calendar: "googleapis.com/auth/calendar",
} as const;

export type ScopeKey = keyof typeof SCOPE_KEYS;

/**
 * Verifica si un scope específico está incluido en el string de scopes de Google.
 * El campo `scope` de la API es una cadena de URLs separadas por espacios.
 */
export function hasScope(scope: string | undefined, key: ScopeKey): boolean {
  if (!scope) return false;
  return scope.includes(SCOPE_KEYS[key]);
}
