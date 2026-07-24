import LoginStepManager from "@/src/features/auth/components/LoginStepManager";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Ingresa a tu cuenta para continuar",
};

// La página no depende de datos por-request (el redirect "ya autenticado → /"
// vive en el proxy/edge), así que se fuerza su prerenderizado estático para
// servirla desde CDN y eliminar el cold start del serverless en el TTFB.
export const dynamic = "force-static";

/*
 * Página de login estática (sin `getServerSession`): no espera ninguna
 * comprobación de sesión en el servidor antes de renderizar, por lo que su HTML
 * puede prerenderizarse y servirse desde CDN (TTFB ≈ latencia de red, sin cold
 * start del serverless). El redirect "ya autenticado → /" se aplica ahora en el
 * proxy/middleware (`src/proxy.ts`), que corre en el edge antes de esta página.
 */
export default function LoginPage() {
  return (
    <div className="relative z-10 flex h-175 w-full max-w-300 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
      <div className="relative hidden md:block w-full h-full">
        <Image
          src="/images/login-background.jpg"
          alt="leftSideImage"
          fill
          priority
          quality={80}
          sizes="(min-width: 768px) 50vw, 0px"
          className="object-cover"
        />
      </div>
      <div className="w-full flex flex-col items-center justify-center p-8">
        <LoginStepManager />
      </div>
    </div>
  );
}
