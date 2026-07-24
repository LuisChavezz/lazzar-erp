/**
 * Layout de autenticación — solo envuelve los hijos con el estilo visual.
 *
 * La redirección "si ya hay sesión → ir al dashboard" vive en el proxy/
 * middleware (`src/proxy.ts`), NO en este layout ni en la página. Hacerlo en el
 * edge evita el ciclo infinito que causaría un redirect en el layout/página
 * (withAuth → /auth/login → redirect("/") → withAuth → ...) y permite que
 * `login/page.tsx` sea estática (sin `getServerSession` bloqueante). `withAuth`
 * deja pasar a los usuarios NO autenticados en /auth/login sin redirigir, así
 * que este layout siempre puede renderizar el formulario de login.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen flex items-center justify-center transition-colors duration-300 relative selection:bg-sky-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(56,189,248,0.28),rgba(255,255,255,0))] dark:bg-[radial-gradient(120%_85%_at_50%_-20%,rgba(56,189,248,0.22),rgba(17,17,19,0))]"></div>
      {children}
    </div>
  );
}
