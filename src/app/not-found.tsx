import { redirect } from 'next/navigation';

/**
 * Not-found raíz: cualquier URL inexistente manda al inicio.
 *
 * NO lee la sesión (`getServerSession`) a propósito. El not-found raíz se
 * renderiza dentro del árbol de TODAS las rutas, así que leer cookies aquí
 * volvía dinámicas las 108 rutas de la app (EC-767), igual que el layout de
 * (Main). Tampoco hace falta: `/` está en el matcher de `src/proxy.ts`, que
 * manda a `/auth/login` a quien no tiene sesión y a `/select-branch` a quien no
 * tiene workspace. O sea que el destino final es el mismo de antes:
 *
 *   - Con sesión: `/` (como antes).
 *   - Sin sesión: `/` → proxy → `/auth/login?callbackUrl=%2F` (antes iba directo
 *     a `/auth/login`; ahora hay un salto más).
 *
 * No hay ciclo posible: `/` existe (`app/(Main)/page.tsx`) y nunca cae aquí.
 */
export default function NotFound() {
  redirect('/');
}
