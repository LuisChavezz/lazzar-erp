"use client";

import { LoadingSpinnerIcon, LockIcon, ShieldCheckIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import type { MfaCreateResponse } from "../interfaces/auth.interface";
import { useCreateMfa } from "../hooks/useCreateMfa";

interface MfaActivationPromptProps {
  onMfaCreated: (data: MfaCreateResponse) => void;
  onSkip: () => void;
  isSkipping?: boolean;
}

export default function MfaActivationPrompt({ onMfaCreated, onSkip, isSkipping = false }: MfaActivationPromptProps) {
  const createMfaMutation = useCreateMfa();

  const handleActivate = async () => {
    try {
      const data = await createMfaMutation.mutateAsync();
      onMfaCreated(data);
    } catch {
      // errors handled by mutation state; toast can be added here later
    }
  };

  return (
    <section className="w-full rounded-4xl border border-slate-200/80 bg-white/75 p-6 shadow-xl shadow-sky-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:p-7">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
        <LockIcon className="h-3.5 w-3.5" />
        Seguridad recomendada
      </div>

      <div className="mt-6 space-y-5">
        {/* Header */}
        <div className="space-y-3">
          <h3 className="brand-font text-3xl font-medium text-slate-900 transition-colors dark:text-white">
            ¿Quieres activar MFA?
          </h3>
          <p className="text-sm leading-6 text-slate-500 transition-colors dark:text-slate-400">
            Tus credenciales ya fueron validadas. Refuerza el acceso a tu cuenta con autenticación
            multifactor para proteger mejor tu sesión.
          </p>
        </div>

        {/* Benefits list */}
        <ul className="space-y-2.5">
          {[
            "Protege tu cuenta aunque roben tu contraseña",
            "Acceso mediante app autenticadora (Google, Authy, etc.)",
            "Códigos de respaldo para emergencias",
          ].map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            variant="primary"
            rounded="full"
            disabled={createMfaMutation.isPending || isSkipping}
            onClick={handleActivate}
            leftIcon={
              createMfaMutation.isPending ? (
                <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheckIcon className="h-4 w-4" />
              )
            }
            className="w-full py-3"
          >
            {createMfaMutation.isPending ? "Configurando…" : "Activar autenticación"}
          </Button>

          <Button
            variant="ghost"
            rounded="full"
            className="w-full py-3"
            disabled={isSkipping || createMfaMutation.isPending}
            onClick={onSkip}
          >
            {isSkipping ? "Iniciando sesión..." : "Continuar sin MFA"}
          </Button>
        </div>
      </div>
    </section>
  );
}
