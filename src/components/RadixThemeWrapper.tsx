'use client';

import { useEffect } from 'react';
import { Theme } from '@radix-ui/themes';
import { useThemeStore } from '@/src/stores/theme.store';

/*
 * Inicializa el tema al montar:
 *   1. Lee resolvedTheme del store (ya rehidratado por Zustand persist).
 *   2. Aplica la clase .dark en <html> por si el script anti-FOUC del layout
 *      y el store quedaron desincronizados tras la hidratación de React.
 *   3. Suscribe al evento de cambio de sistema operativo para actualizar
 *      el tema cuando el usuario tiene 'system' seleccionado.
 *
 * Separa esta responsabilidad de Provider.tsx para mantener el archivo limpio
 * y facilitar el testing del wrapper de forma aislada.
 */
export function RadixThemeWrapper({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const syncSystemTheme = useThemeStore((s) => s.syncSystemTheme);
  const hydrate = useThemeStore((s) => s.hydrate);

  /*
   * Al montar el cliente, rehidrata resolvedTheme con la preferencia real del
   * sistema operativo. Se usa `hydrate` (no `setTheme`) porque lee state.theme
   * desde el estado actual del store — evita sobrescribir la preferencia
   * persistida con un valor obsoleto capturado en el closure.
   */
  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    hydrate(isSystemDark);
  }, [hydrate]);

  // Suscripción a cambios de preferencia del sistema operativo
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => syncSystemTheme(e.matches);

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [syncSystemTheme]);

  return (
    <Theme appearance={resolvedTheme}>
      {children}
    </Theme>
  );
}
