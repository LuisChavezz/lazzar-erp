"use client";

import { startTransition, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import LoginForm from "./LoginForm";
import type { LoginSuccessResponse, MfaCreateResponse } from "../interfaces/auth.interface";

/**
 * Los pasos de MFA no forman parte de la vista inicial de credenciales: solo
 * se montan después de un login exitoso. Se cargan de forma diferida con
 * next/dynamic (ssr: false) para sacarlos —junto con react-qr-code— del bundle
 * inicial de la ruta /auth/login, reduciendo el JS de hidratación y el First
 * Load JS sin alterar el comportamiento (siguen gated por `mountedSteps`).
 */
const StepLoadingFallback = () => (
  <div className="flex min-h-108 w-full items-center justify-center" aria-hidden>
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
  </div>
);

const MfaActivationPrompt = dynamic(() => import("./MfaActivationPrompt"), {
  ssr: false,
  loading: StepLoadingFallback,
});
const MfaQrSetup = dynamic(() => import("./MfaQrSetup"), {
  ssr: false,
  loading: StepLoadingFallback,
});
const MfaOtpVerify = dynamic(() => import("./MfaOtpVerify"), {
  ssr: false,
  loading: StepLoadingFallback,
});

export type LoginStep = "credentials" | "mfa-opt-in" | "mfa-setup" | "mfa-otp";

interface StepPanelProps {
  visible: boolean;
  /** Dirección de salida del panel al ocultarse:
   *  - "up"   → sale hacia arriba  (-translate-y-4)
   *  - "down" → sale hacia abajo   ( translate-y-4)
   */
  direction: "up" | "down";
  children: ReactNode;
}

function StepPanel({ visible, direction, children }: StepPanelProps) {
  return (
    <div
      aria-hidden={!visible}
      className={`col-start-1 row-start-1 w-full transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
        visible
          ? "relative opacity-100 translate-y-0 scale-100"
          : `pointer-events-none absolute inset-0 opacity-0 ${
              direction === "up" ? "-translate-y-4" : "translate-y-4"
            } scale-[0.985]`
      }`}
    >
      {children}
    </div>
  );
}

/**
 * LoginStepManager
 *
 * Orquesta las vistas del flujo de autenticación dentro de la página de login.
 * Gestiona el estado del paso activo y las transiciones animadas entre paneles.
 *
 * Pasos actuales:
 *  - "credentials"  → formulario de email / contraseña (LoginForm)
 *  - "mfa-opt-in"   → invitación a activar MFA (MfaActivationPrompt)
 *
 * Para agregar un nuevo paso:
 *  1. Añadir el valor al tipo LoginStep.
 *  2. Agregar un <StepPanel> adicional con su componente correspondiente.
 */
export default function LoginStepManager() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [mountedSteps, setMountedSteps] = useState<Record<LoginStep, boolean>>({
    credentials: true,
    "mfa-opt-in": false,
    "mfa-setup": false,
    "mfa-otp": false,
  });
  const [mfaData, setMfaData] = useState<MfaCreateResponse | null>(null);
  /* token efímero recibido en el login cuando el usuario ya tiene MFA activo */
  const [ephemeralToken, setEphemeralToken] = useState<string | null>(null);
  /* token de acceso recibido en la respuesta de login cuando mfa_enabled = false */
  const [loginAccessToken, setLoginAccessToken] = useState<string | null>(null);
  /* true cuando el usuario llega al OTP desde un login con MFA ya activo */
  const [mfaLoginMode, setMfaLoginMode] = useState(false);
  /* true cuando se acaba de confirmar MFA por primera vez */
  const [mfaJustConfirmed, setMfaJustConfirmed] = useState(false);
  /* true mientras se crea la sesión nextauth en el flujo sin MFA */
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const goToStep = (next: LoginStep) => {
    setMountedSteps((current) => {
      if (current[next]) {
        return current;
      }

      return {
        ...current,
        [next]: true,
      };
    });

    startTransition(() => {
      setStep(next);
    });
  };

  const handleMfaCreated = (data: MfaCreateResponse) => {
    setMfaData(data);
    goToStep("mfa-setup");
  };

  /* Llamado desde LoginForm cuando mfa_enabled = false: guarda el token de acceso para usarlo en skip */
  const handleShowMfaOptIn = (data: LoginSuccessResponse) => {
    if (data.access) setLoginAccessToken(data.access);
    goToStep("mfa-opt-in");
  };

  /* Llamado desde useLoginForm cuando mfa_enabled === true en la response */
  const handleMfaRequired = (data: LoginSuccessResponse) => {
    setEphemeralToken(data.ephemeral_token ?? null);
    setMfaLoginMode(true);
    goToStep("mfa-otp");
  };

  /* Flujo "Continuar sin MFA": crea la sesión NextAuth a partir del token ya emitido
   * por el backend; `authorize()` lo verifica contra /auth/user/ antes de crearla */
  const handleSkipMfa = async () => {
    if (!loginAccessToken) {
      toast.error("No se encontraron los datos del usuario. Por favor, vuelve a iniciar sesión.");
      return;
    }

    setIsCreatingSession(true);

    try {
      const result = await signIn("credentials", {
        accessToken: loginAccessToken,
        redirect: false,
      });

      if (result?.error) {
        toast.error("No se pudo crear la sesión. Intenta de nuevo.");
        setIsCreatingSession(false);
        return;
      }

      router.push("/select-branch");
    } catch {
      toast.error("Error inesperado al iniciar sesión.");
      setIsCreatingSession(false);
    }
  };

  /* Llamado desde MfaOtpVerify tras confirmar MFA exitosamente (flujo de setup) */
  const handleMfaConfirmed = () => {
    setMfaLoginMode(false);
    setMfaJustConfirmed(true);
    goToStep("credentials");
  };

  return (
    <div className="md:w-96 w-80 flex flex-col items-center justify-center">
      <div className="relative grid w-full min-h-108 grid-cols-1">

        <StepPanel visible={step === "credentials"} direction="up">
          <LoginForm
            onShowMfaOptIn={handleShowMfaOptIn}
            onMfaRequired={handleMfaRequired}
            showMfaConfirmedBanner={mfaJustConfirmed}
            onDismissBanner={() => setMfaJustConfirmed(false)}
          />
        </StepPanel>

        {mountedSteps["mfa-opt-in"] ? (
          <StepPanel visible={step === "mfa-opt-in"} direction="down">
            <MfaActivationPrompt
              onMfaCreated={handleMfaCreated}
              onSkip={handleSkipMfa}
              isSkipping={isCreatingSession}
            />
          </StepPanel>
        ) : null}

        {mountedSteps["mfa-setup"] ? (
          <StepPanel visible={step === "mfa-setup"} direction="down">
            {mfaData && (
              <MfaQrSetup mfaData={mfaData} onContinue={() => goToStep("mfa-otp")} />
            )}
          </StepPanel>
        ) : null}

        {mountedSteps["mfa-otp"] ? (
          <StepPanel visible={step === "mfa-otp"} direction="down">
            <MfaOtpVerify
              onBack={() => goToStep("mfa-setup")}
              onSuccess={mfaLoginMode ? undefined : handleMfaConfirmed}
              mfaAlreadyEnabled={mfaLoginMode}
              ephemeralToken={ephemeralToken ?? undefined}
            />
          </StepPanel>
        ) : null}

      </div>
    </div>
  );
}
