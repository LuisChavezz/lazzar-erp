"use client";

import { startTransition, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import LoginForm from "./LoginForm";
import MfaActivationPrompt from "./MfaActivationPrompt";
import MfaQrSetup from "./MfaQrSetup";
import MfaOtpVerify from "./MfaOtpVerify";
import type { LoginSuccessResponse, MfaCreateResponse, MfaLoginUser } from "../interfaces/auth.interface";

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
  const [mfaData, setMfaData] = useState<MfaCreateResponse | null>(null);
  /* token efímero recibido en el login cuando el usuario ya tiene MFA activo */
  const [ephemeralToken, setEphemeralToken] = useState<string | null>(null);
  /* usuario recibido en la respuesta de login cuando mfa_enabled = false */
  const [loginUser, setLoginUser] = useState<MfaLoginUser | null>(null);
  /* true cuando el usuario llega al OTP desde un login con MFA ya activo */
  const [mfaLoginMode, setMfaLoginMode] = useState(false);
  /* true cuando se acaba de confirmar MFA por primera vez */
  const [mfaJustConfirmed, setMfaJustConfirmed] = useState(false);
  /* true mientras se crea la sesión nextauth en el flujo sin MFA */
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const goToStep = (next: LoginStep) => {
    startTransition(() => {
      setStep(next);
    });
  };

  const handleMfaCreated = (data: MfaCreateResponse) => {
    setMfaData(data);
    goToStep("mfa-setup");
  };

  /* Llamado desde LoginForm cuando mfa_enabled = false: guarda el usuario para usarlo en skip */
  const handleShowMfaOptIn = (data: LoginSuccessResponse) => {
    if (data.user) setLoginUser(data.user);
    goToStep("mfa-opt-in");
  };

  /* Llamado desde useLoginForm cuando mfa_enabled === true en la response */
  const handleMfaRequired = (data: LoginSuccessResponse) => {
    setEphemeralToken(data.ephemeral_token ?? null);
    setMfaLoginMode(true);
    goToStep("mfa-otp");
  };

  /* Flujo "Continuar sin MFA": crea la sesión NextAuth con los datos del usuario ya autenticado */
  const handleSkipMfa = async () => {
    if (!loginUser) {
      toast.error("No se encontraron los datos del usuario. Por favor, vuelve a iniciar sesión.");
      return;
    }

    setIsCreatingSession(true);

    try {
      const result = await signIn("credentials", {
        userData: JSON.stringify(loginUser),
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

        <StepPanel visible={step === "mfa-opt-in"} direction="down">
          <MfaActivationPrompt
            onMfaCreated={handleMfaCreated}
            onSkip={handleSkipMfa}
            isSkipping={isCreatingSession}
          />
        </StepPanel>

        <StepPanel visible={step === "mfa-setup"} direction="down">
          {mfaData && (
            <MfaQrSetup mfaData={mfaData} onContinue={() => goToStep("mfa-otp")} />
          )}
        </StepPanel>

        <StepPanel visible={step === "mfa-otp"} direction="down">
          <MfaOtpVerify
            onBack={() => goToStep("mfa-setup")}
            onSuccess={mfaLoginMode ? undefined : handleMfaConfirmed}
            mfaAlreadyEnabled={mfaLoginMode}
            ephemeralToken={ephemeralToken ?? undefined}
          />
        </StepPanel>

      </div>
    </div>
  );
}
