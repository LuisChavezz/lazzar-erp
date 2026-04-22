'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Página 404 — redirige al inicio usando el router del cliente.
 *
 * Se implementa como Client Component con useEffect para evitar que
 * `redirect()` interrumpa el ciclo de render de React 19.2, lo cual
 * genera marcas de rendimiento (Performance Tracks) con timestamps
 * negativos en el cliente Turbopack RSC:
 *   TypeError: Failed to execute 'measure' on 'Performance':
 *   '​NotFound' cannot have a negative time stamp.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
